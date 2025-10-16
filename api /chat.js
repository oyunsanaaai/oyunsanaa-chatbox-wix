// /api/chat.js  — Vercel serverless function (Node.js)
// Node runtime:
export const config = { runtime: 'nodejs18.x' };

function pickModel({ text = '', images = [] }) {
  // Урт яриа эсвэл зурагтай бол 4.0, бусад нь 4.0-mini
  const long = (text || '').trim().length > 400 || images.length > 0;
  return long ? 'gpt-4.0' : 'gpt-4.0-mini';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, tip: 'POST /api/chat' });
  }

  try {
    const { moduleId, text = '', images = [], chatHistory = [], userLang = 'mn' } =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const model = pickModel({ text, images });

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_BETA;
    if (!apiKey) {
      // Ключ тохируулаагүй бол түр зуурын stub
      return res.status(200).json({
        ok: true,
        model,
        reply: `[stub] (${model}) «${moduleId}» дээр ирсэн текст: ${text || '(хоосон)'}`
      });
    }

    // --- Жинхэнэ дуудлага (JSON-mode) ---
    const messages = [
      { role: 'system', content: `You are Oyunsanaa assistant. Reply in ${userLang}. Module=${moduleId}.` },
      ...chatHistory,
      { role: 'user', content: text || '(no text)' }
    ];

    // Хэрэв зургууд байвал multimodal оруулах
    if (images.length) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: '(see attached images)' },
          ...images.map(u => ({ type: 'input_image', image_url: u }))
        ]
      });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ ok: false, error: 'openai_failed', detail: errText });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '…';

    return res.status(200).json({ ok: true, model, reply });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server_error', detail: String(e) });
  }
}
