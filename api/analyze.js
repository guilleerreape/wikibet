// Vercel Serverless Function — Claude AI Proxy
// Called by the browser instead of hitting api.anthropic.com directly.
// This avoids browser CORS/security restrictions and is more reliable.

export default async function handler(req, res) {
  // CORS headers so the Expo web app can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { prompt, maxTokens } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens || 6000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[WikiBet API] Claude error:', anthropicResponse.status, errText);
      return res.status(anthropicResponse.status).json({ error: errText });
    }

    const data = await anthropicResponse.json();
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (e) {
    console.error('[WikiBet API] Proxy error:', e);
    return res.status(500).json({ error: String(e) });
  }
}
