// /api/chat.js — Оюунсанаагийн чат API (Vercel Serverless Function)
// ENV: OPENAI_API_KEY (Vercel → Settings → Environment Variables)

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  }

  try {
    const { moduleId = 'psychology', text = '', images = [], chatHistory = [], userLang } = req.body || {};

    // Модель сонгох дүрэм:
    // - Хэрвээ зураг байвал эсвэл текст урт бол 4.0 (vision)
    // - Бусад богино зүйлд 4.0-mini
    const use4o = images?.length > 0 || (text && text.length > 400);
    const model = use4o ? 'gpt-4o' : 'gpt-4o-mini';

    // Систем тохиргоо — богино чиглүүлэг
    const system = [
      `Та "Оюунсанаа" туслах.`,
      `Модуль: ${moduleId}.`,
      `Хэл: ${userLang || 'mn'}.`,
      `Зураг ирсэн бол эхлээд товчхон тайлбарла, дараа нь хэрэглэгчийн зорилгод тааруулж зөвлө.`,
    ].join(' ');

    // Түүхээс 8 мессеж л авч явна
    const history = (chatHistory || []).slice(-8);

    // messages (vision-тэй нийцүүлж content массив)
    let userContent = [];
    if (text) userContent.push({ type: 'text', text });

    for (const url of images || []) {
      userContent.push({
        type: 'image_url',
        image_url: { url }, // data:... URL бас болно
      });
    }

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: userContent.length ? userContent : [{ type: 'text', text: 'Сайн байна уу' }] },
    ];

    // OpenAI API (Chat Completions)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ ok: false, error: 'OPENAI_ERROR', detail: txt });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '…';

    return res.status(200).json({ ok: true, model, reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}
