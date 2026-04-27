module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'ANTHROPIC_API_KEY not set' });

  var url = req.body && req.body.url;
  if (!url) return res.status(200).json({ error: 'No URL provided' });

  try {
    // Fetch the webpage
    var pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!pageRes.ok) return res.status(200).json({ error: 'Could not fetch that page (status ' + pageRes.status + '). The site may block automated access.' });

    var html = await pageRes.text();

    // Strip scripts, styles, nav etc to reduce tokens
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000); // Keep within token limits

    // Send to Claude
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: 'Extract the recipe from this webpage text. If ingredients are grouped into sub-sections (e.g. Salmon, Sauce, Vegetables), prefix each ingredient with the group name in brackets like "[Salmon] 2 fillets". Return ONLY valid JSON, no markdown, no smart quotes:\n{"title":"Recipe name","author":"Author or empty string","servings":"4 or empty string","category":"Dinner","ingredients":["ingredient 1"],"method":["Step 1"],"notes":"Any tips or notes or empty string"}\n\nWebpage text:\n' + html
        }]
      })
    });

    var bodyText = await response.text();
    if (!response.ok) return res.status(200).json({ error: 'Claude error: ' + bodyText.slice(0, 200) });

    var data = JSON.parse(bodyText);
    var text = (data.content || []).map(function(b) { return b.text || ''; }).join('').trim();
    if (!text) return res.status(200).json({ error: 'No response from Claude' });

    // Clean up
    var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    var match = cleaned.match(/\{[\s\S]+\}/);
    if (!match) return res.status(200).json({ error: 'Could not extract recipe. Claude said: ' + text.slice(0, 200) });

    var recipe = JSON.parse(match[0]);
    return res.status(200).json({ recipe: recipe });

  } catch(err) {
    if (err.name === 'TimeoutError') return res.status(200).json({ error: 'The page took too long to load.' });
    return res.status(200).json({ error: 'Server error: ' + (err.message || String(err)) });
  }
};
