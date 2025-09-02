export default async function handler(req, res) {
  // --- CORS (хийсэн хэвээрээ байг) ---
  // ... чиний CORS хэсэг ...

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

    const body = req.body || {};
    // 1) Моделийг уян хатан авах
    const model = String(body.model || '').trim() || 'gpt-4o-mini';

    // 2) Мессежийг уян хатан авах
    // - Хэрэв messages[] ирсэн бол шууд ашиглана
    // - Үгүй бол msg-г user мессеж болгон хувиргана
    let messages = [];
    if (Array.isArray(body.messages) && body.messages.length) {
      messages = body.messages
        .map(m => ({ role: m.role || 'user', content: String(m.content || '').trim() }))
        .filter(m => m.content.length);
    } else {
      const msg = String(body.msg || body.message || '').trim();
      if (!msg) return res.status(400).json({ error: 'Empty message' });
      messages = [
        { role: 'system', content: 'Та Оюунсанаа чат. Дулаахан, ойлгомжтой тусал.' },
        { role: 'user', content: msg }
      ];
    }

    // 3) OpenAI дуудлага (fetch хэвээр)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages })
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
    return res.status(200).json({ reply, model });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
