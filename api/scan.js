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
{ type: ‘text’, text: ‘Extract the recipe from this image. Return ONLY a JSON object, no markdown:\n{“title”:“Recipe name”,“category”:“one of: Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Other”,“ingredients”:[“ingredient 1”],“method”:[“Step 1”]}’ }
]
}]
})
});

```
const bodyText = await response.text();
if (!response.ok) return res.status(200).json({ error: 'Anthropic error ' + response.status + ': ' + bodyText.slice(0, 300) });

const data = JSON.parse(bodyText);
const text = (data.content || []).map(function(b) { return b.text || ''; }).join('').trim();
const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
const match = cleaned.match(/\{[\s\S]+\}/);
if (!match) return res.status(200).json({ error: 'No recipe found. Claude said: ' + text.slice(0, 200) });

const recipe = JSON.parse(match[0]);
return res.status(200).json({ recipe: recipe });
```

} catch (err) {
return res.status(200).json({ error: err.message || ‘Server error’ });
}
}
