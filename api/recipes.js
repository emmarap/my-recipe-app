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
const KEY = 'recipes.json';

async function getRecipes() {
  try {
    const client = getClient();
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const str = await res.Body.transformToString();
    return JSON.parse(str);
  } catch (e) {
    if (e.name === 'NoSuchKey') return [];
    throw e;
  }
}

async function putRecipes(recipes) {
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: JSON.stringify(recipes),
    ContentType: 'application/json',
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const recipes = await getRecipes();
      return res.status(200).json({ recipes });
    }

    if (req.method === 'POST') {
      const recipe = req.body;
      if (!recipe || !recipe.id) return res.status(400).json({ error: 'No recipe id' });
      const recipes = await getRecipes();
      const idx = recipes.findIndex(function(r) { return r.id === recipe.id; });
      if (idx !== -1) recipes[idx] = recipe;
      else recipes.unshift(recipe);
      await putRecipes(recipes);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.body && req.body.id;
      if (!id) return res.status(400).json({ error: 'No id' });
      const recipes = await getRecipes();
      const filtered = recipes.filter(function(r) { return r.id !== id; });
      await putRecipes(filtered);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('recipes.js error:', e);
    return res.status(500).json({ error: e.message });
  }
};
