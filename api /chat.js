export const config = { runtime: 'nodejs20' };
/ /api/chat.js  — Node runtime, CORS + body parse, oy.js-д таарах хэлбэрээр хариулна
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST /api/chat' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  // Body-г найдвартай унших
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const userText = (body && body.text) || '';
  const history  = (body && body.chatHistory) || [];
  const userLang = (body && body.userLang) || 'mn';

  try {
    // Түүхийг OpenAI форматад хөрвүүлнэ
    const messages = [
      { role: 'system', content: `You are Oyunsanaa, a helpful Mongolian assistant (user language: ${userLang}).` },
      ...history,
      ...(userText ? [{ role:'user', content: userText }] : [])
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: 'Upstream error', detail: data });

    const reply = data?.choices?.[0]?.message?.content || '…';
    // ⬇️ oy.js нь {reply, model} гэж хүлээж авдаг тул ийм хэлбэрээр буцаана
    return res.status(200).json({ reply, model: data?.model || 'gpt-4o-mini' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
