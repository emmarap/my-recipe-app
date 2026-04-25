module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'ANTHROPIC_API_KEY not set' });
  var imageBase64 = req.body && req.body.imageBase64;
  var mediaType = (req.body && req.body.mediaType) || 'image/jpeg';
  if (!imageBase64) return res.status(200).json({ error: 'No image received' });
  try {
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
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: 'Extract the recipe from this image. Return ONLY valid JSON, no markdown, no extra text, no smart quotes, no special characters. Use only straight ASCII quotes inside strings:\n{"title":"Recipe name","category":"Dinner","ingredients":["ingredient 1","ingredient 2"],"method":["Step 1","Step 2"]}' }
          ]
        }]
      })
    });
    var bodyText = await response.text();
    if (!response.ok) return res.status(200).json({ error: 'Anthropic error ' + response.status + ': ' + bodyText.slice(0, 300) });
    var data = JSON.parse(bodyText);
    var text = (data.content || []).map(function(b) { return b.text || ''; }).join('').trim();
    if (!text) return res.status(200).json({ error: 'Empty response. Raw: ' + bodyText.slice(0, 300) });
    // Strip markdown fences
    var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    // Replace smart quotes with straight quotes
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    // Extract JSON object
    var match = cleaned.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: 'Claude said: ' + text.slice(0, 300) });
    var jsonStr = match[0];
    // Try parsing, if it fails try to fix common issues
    var recipe;
    try {
      recipe = JSON.parse(jsonStr);
    } catch(parseErr) {
      // Remove any non-ASCII characters that might break JSON
      jsonStr = jsonStr.replace(/[^\x00-\x7F]/g, function(c) {
        // Keep common unicode but escape it properly
        return c;
      });
      // Try once more
      recipe = JSON.parse(jsonStr);
    }
    return res.status(200).json({ recipe: recipe });
  } catch (err) {
    return res.status(200).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
};
