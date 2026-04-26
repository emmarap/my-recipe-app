module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'ANTHROPIC_API_KEY not set' });

  // Support both single image (legacy) and multiple images
  var images = [];
  if (req.body && req.body.images && Array.isArray(req.body.images)) {
    images = req.body.images;
  } else if (req.body && req.body.imageBase64) {
    images = [{ imageBase64: req.body.imageBase64, mediaType: req.body.mediaType || 'image/jpeg' }];
  }
  if (!images.length) return res.status(200).json({ error: 'No images received' });

  try {
    // Build content array with all images + prompt
    var content = images.map(function(im) {
      return { type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.imageBase64 } };
    });
    var promptText = images.length > 1
      ? 'These ' + images.length + ' images together show one recipe (e.g. ingredients in one photo, method in another). Extract the complete combined recipe. Return ONLY valid JSON, no markdown, no smart quotes:\n{"title":"Recipe name","author":"Author name or empty string","servings":"4 or empty string","category":"Dinner","ingredients":["ingredient 1","ingredient 2"],"method":["Step 1","Step 2"]}'
      : 'Extract the recipe from this image. Return ONLY valid JSON, no markdown, no smart quotes:\n{"title":"Recipe name","author":"Author name or empty string","servings":"4 or empty string","category":"Dinner","ingredients":["ingredient 1","ingredient 2"],"method":["Step 1","Step 2"]}';
    content.push({ type: 'text', text: promptText });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: content }]
      })
    });

    var bodyText = await response.text();
    if (!response.ok) return res.status(200).json({ error: 'Anthropic error ' + response.status + ': ' + bodyText.slice(0, 300) });
    var data = JSON.parse(bodyText);
    var text = (data.content || []).map(function(b) { return b.text || ''; }).join('').trim();
    if (!text) return res.status(200).json({ error: 'Empty response' });
    var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    var match = cleaned.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: 'Claude said: ' + text.slice(0, 300) });
    var recipe = JSON.parse(match[0]);
    return res.status(200).json({ recipe: recipe });
  } catch (err) {
    return res.status(200).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
};
