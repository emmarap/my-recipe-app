export const config = { api: { bodyParser: { sizeLimit: ‘10mb’ } } };

export default async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘POST, OPTIONS’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);
if (req.method === ‘OPTIONS’) return res.status(200).end();
if (req.method !== ‘POST’) return res.status(405).json({ error: ‘Method not allowed’ });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) return res.status(200).json({ error: ‘ANTHROPIC_API_KEY not set’ });

const { imageBase64, mediaType } = req.body || {};
if (!imageBase64) return res.status(200).json({ error: ‘No image received’ });

try {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘content-type’: ‘application/json’,
‘x-api-key’: apiKey,
‘anthropic-version’: ‘2023-06-01’
},
body: JSON.stringify({
model: ‘claude-haiku-4-5-20251001’,
max_tokens: 1500,
messages: [{
role: ‘user’,
content: [
{ type: ‘image’, source: { type: ‘base64’, media_type: mediaType || ‘image/jpeg’, data: imageBase64 } },
{ type: ‘text’, text: ‘Extract the recipe from this image. Return ONLY a JSON object, no markdown, no explanation:\n{“title”:“Recipe name”,“category”:“one of: Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Other”,“ingredients”:[“ingredient 1”],“method”:[“Step 1”]}’ }
]
}]
})
});

```
const bodyText = await response.text();

if (!response.ok) {
  return res.status(200).json({ error: 'Anthropic error ' + response.status + ': ' + bodyText.slice(0, 300) });
}

let data;
try { data = JSON.parse(bodyText); } 
catch(e) { return res.status(200).json({ error: 'Could not parse Anthropic response: ' + bodyText.slice(0, 200) }); }

const text = (data.content || []).map(b => b.text || '').join('').trim();

if (!text) {
  return res.status(200).json({ error: 'Empty response from Claude. Full response: ' + bodyText.slice(0, 300) });
}

const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
const match = cleaned.match(/\{[\s\S]+\}/);

if (!match) {
  return res.status(200).json({ error: 'Claude said: ' + text.slice(0, 300) });
}

let recipe;
try { recipe = JSON.parse(match[0]); }
catch(e) { return res.status(200).json({ error: 'Recipe JSON parse failed: ' + match[0].slice(0, 200) }); }

return res.status(200).json({ recipe: recipe });
```

} catch (err) {
return res.status(200).json({ error: ’Server error: ’ + (err.message || String(err)) });
}
}
