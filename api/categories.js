const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME;
const KEY = 'categories.json';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = getClient();

  try {
    if (req.method === 'GET') {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
        const str = await result.Body.transformToString();
        return res.status(200).json(JSON.parse(str));
      } catch (e) {
        if (e.name === 'NoSuchKey') return res.status(200).json({ categories: [] });
        throw e;
      }
    }

    if (req.method === 'POST') {
      const { categories } = req.body || {};
      if (!Array.isArray(categories)) return res.status(400).json({ error: 'Invalid categories' });
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
        Body: JSON.stringify({ categories }),
        ContentType: 'application/json',
      }));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('categories.js error:', e);
    return res.status(500).json({ error: e.message });
  }
};
