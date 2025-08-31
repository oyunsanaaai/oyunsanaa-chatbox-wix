// pages/api/oy-chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });

    const { msg = '', history = [] } = req.body || {};

    const messages = [];
    for (const m of history) {
      const role = m.who === 'user' ? 'user' : 'assistant';
      const content = String(m.html || '').replace(/<[^>]+>/g, '');
      messages.push({ role, content });
    }
    messages.push({ role: 'user', content: String(msg) });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',   // ✅ зөвхөн шинэ model
        messages,
        temperature: 0.5,
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'OpenAI API error' });

    return res.status(200).json({ reply: data?.choices?.[0]?.message?.content || '' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
