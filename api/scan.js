const { list, put, get, del } = require(’@vercel/blob’);

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET, POST, DELETE, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) return res.status(200).end();

try {
if (req.method === ‘GET’) {
// Get all recipes
const { blobs } = await list({ prefix: ‘recipes/’ });
const recipes = [];
for (const blob of blobs) {
const response = await fetch(blob.url);
const recipe = await response.json();
recipes.push(recipe);
}
recipes.sort(function(a, b) { return b.savedAt > a.savedAt ? 1 : -1; });
return res.status(200).json({ recipes });

```
} else if (req.method === 'POST') {
  // Save a recipe
  const recipe = req.body;
  if (!recipe || !recipe.id) return res.status(200).json({ error: 'No recipe data' });
  const blob = await put('recipes/' + recipe.id + '.json', JSON.stringify(recipe), {
    access: 'public',
    contentType: 'application/json'
  });
  return res.status(200).json({ ok: true, url: blob.url });

} else if (req.method === 'DELETE') {
  // Delete a recipe
  const id = req.body && req.body.id;
  if (!id) return res.status(200).json({ error: 'No id provided' });
  const { blobs } = await list({ prefix: 'recipes/' + id });
  for (const blob of blobs) { await del(blob.url); }
  return res.status(200).json({ ok: true });
}

return res.status(405).json({ error: 'Method not allowed' });
```

} catch(err) {
return res.status(200).json({ error: ’Server error: ’ + (err.message || String(err)) });
}
};
