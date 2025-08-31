export default async function handler(req, res) {
  const ORIGINS = [
    'https://chat.oyunsanaa.com',
    'https://oyunsanaa-chatbox-wix.vercel.app',
    'http://localhost:3000',
  ];
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST is allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

    let { model, msg = '', history = [], chatSlug = '' } = req.body || {};

    const MAP = new Map([
      ['gpt-4o', 'gpt-4o'],
      ['gpt-4o-mini', 'gpt-4o-mini'],
    ]);
    const resolvedModel = MAP.get(String(model || '').trim()) || 'gpt-4o-mini';

    const messages = [];
    messages.push({
      role: 'system',
      content:
        'You are Oyunsanaa Chat. Answer warmly, in Mongolian by default. Be practical, structured, and detailed.',
    });

    for (const m of history || []) {
      const role = m?.who === 'user' ? 'user' : 'assistant';
      const content = String(m?.html ?? '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (content) messages.push({ role, content });
    }

    const userMsg = String(msg || '').trim();
    if (!userMsg) return res.status(400).json({ error: 'Empty message' });
    messages.push({ role: 'user', content: userMsg });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        temperature: 0.6,
        max_tokens: 700,
        presence_penalty: 0.1,
        frequency_penalty: 0.2,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[oy-chat] OpenAI error:', r.status, data);
      return res.status(r.status).json({ error: data?.error?.message || 'OpenAI API error' });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || '';
    const actual = data?.model || resolvedModel;
    return res.status(200).json({
      reply,
      model: resolvedModel,
      openai_model: actual,
    });
  } catch (e) {
    console.error('[oy-chat] server error:', e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
