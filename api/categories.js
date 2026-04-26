const { list, put, del } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'categories/' });
      if (!blobs.length) return res.status(200).json({ categories: [] });
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      return res.status(200).json({ categories: data.categories || [] });

    } else if (req.method === 'POST') {
      const { categories } = req.body;
      if (!categories) return res.status(200).json({ error: 'No categories data' });
      // Delete existing and save fresh
      const { blobs: existing } = await list({ prefix: 'categories/' });
      for (const blob of existing) { await del(blob.url); }
      await put('categories/categories.json', JSON.stringify({ categories }), {
        access: 'public',
        contentType: 'application/json'
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch(err) {
    return res.status(200).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
};
