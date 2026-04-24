export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'ANTHROPIC_API_KEY not set' });

  const imageBase64 = req.body.imageBase64;
const mediaType = req.body.mediaType;

  if (!imageBase64) return res.status(200).json({ error: 'No image received by server. Body keys: ' + Object.keys(req.body || {}).join(', ') });

  return res.status(200).json({ 
    received: true, 
    imageLength: imageBase64.length,
    mediaType: mediaType
  });
}
