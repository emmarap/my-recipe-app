const https = require('https');
const crypto = require('crypto');

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}
function signHex(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest('hex');
}
function getSignatureKey(secret, date, region, service) {
  return sign(sign(sign(sign('AWS4' + secret, date), region), service), 'aws4_request');
}

function r2Request(method, key, body) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = signHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: `/${key}`,
      method,
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': bodyHash,
        'Authorization': authorization,
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const r = await r2Request('GET', 'categories.json', '');
      if (r.status === 404 || r.status === 403) return res.status(200).json({ categories: [] });
      if (r.status !== 200) throw new Error('R2 GET failed: ' + r.status);
      return res.status(200).json(JSON.parse(r.body));
    }
    if (req.method === 'POST') {
      const { categories } = req.body || {};
      if (!Array.isArray(categories)) return res.status(400).json({ error: 'Invalid' });
      const body = JSON.stringify({ categories });
      const r = await r2Request('PUT', 'categories.json', body);
      if (r.status !== 200) throw new Error('R2 PUT failed: ' + r.status);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('categories error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
