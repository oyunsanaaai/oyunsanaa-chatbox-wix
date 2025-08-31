// pages/api/oy-chat.js

export default async function handler(req, res) {
  // --- CORS (preflight + зөвшөөрөл) ---
  const ORIGINS = [
    'https://chat.oyunsanaa.com',
    'https://oyunsanaa-chatbox-wix.vercel.app',
    'http://localhost:3000',
  ];
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST is allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

    // UI-аас ирэх өгөгдөл
    let { model, msg, history = [] } = req.body || {};

    // 3.5 ирвэл автоматаар 4o-mini руу "дэвшүүлнэ" (3.5-д огт дуудлага хийхгүй)
    const MAP = new Map([
      ['gpt-4o', 'gpt-4o'],
      ['gpt-4o-mini', 'gpt-4o-mini'],
      ['gpt-3.5-turbo', 'gpt-4o-mini'],
      ['3.5', 'gpt-4o-mini'],
    ]);
    const resolvedModel = MAP.get(model) || 'gpt-4o-mini';

    // Түүхийг OpenAI формат руу хувиргана
    const messages = [];
    for (const m of history) {
      const role = m?.who === 'user' ? 'user' : 'assistant';
      const content = String(m?.html || '').replace(/<[^>]+>/g, '').trim();
      if (content) messages.push({ role, content });
    }
    messages.push({ role: 'user', content: String(msg || '') });

    // OpenAI руу дуудлага
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        temperature: 0.4,
        stream: false,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('[oy-chat] OpenAI error:', r.status, data);
      return res
        .status(r.status)
        .json({ error: data?.error?.message || 'OpenAI API error' });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('[oy-chat] server error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
