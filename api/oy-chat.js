// /api/oy-chat.js
export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────
  const ALLOW = [
    /^https?:\/\/chat\.oyunsanaa\.com$/,
    /^https?:\/\/oyunsanaa\-chatbox\-wix\.vercel\.app$/,
    /^http:\/\/localhost:3000$/
  ];
  const origin = req.headers.origin || '';
  if (ALLOW.some(re => re.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

  // ── API key ──────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

  try {
    // ── Body robust parse (fetch/edge sometimes sends string) ──
    let raw = req.body;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = {}; }
    }
    const body = raw || {};

    // ── Inputs ─────────────────────────────────────
    const model = String(body.model || '').trim() || 'gpt-4o-mini';
   const msg =
  (typeof body.msg === 'string' && body.msg.trim()) ||
  (Array.isArray(body.messages) && String(body.messages[0]?.content || '').trim()) ||
  '';
    if (!msg) {
      return res.status(400).json({
        error: 'Empty message',
        hint: 'Send {"msg":"..."} OR {"messages":[{"role":"user","content":"..."}]}'
      });
    }

  // ---- Messages (илүү хүнлэг prompt) ----
// === persona + system prompt + messages  (ОРЛУУЛАХ ХЭСЭГ) ===

// 1) Frontend-ээс ирсэн persona (өгөгдөөгүй бол 'soft')
const persona = String(body.persona || '').trim() || 'soft';

// 2) Persona бүрийн системийн загвар (богино, амьд яриа)
const personaPrompts = {
  soft: `Чи “Оюунсанаа” — дулаан, халамжтай, хөгжилтэй.
- Хариулт 2–4 өгүүлбэр. Жагсаалт, гарчиг, тест санал БҮҮ тавь.
- Эмпати илэрхийл: “Ойлголоо”, “Хэцүү сонсогдож байна” г.м.
- Зөвлөмж бол товч, 1–2 алхам л санал болго.
- Эцэст нь 1 богино асуулт байж БОЛНО. Emoji 0–1 :)`,

  tough: `Чи “Оюунсанаа” — хатуухан, зорилго чиглүүлэгч.
- 2–4 өгүүлбэр. Тодорхой нэг алхам хэл.
- Илүүц лекц, жагсаалт БҮҮ бич. Сүүлд 1 асуулт.`,

  wise: `Чи “Оюунсанаа” — ухаалаг, тунгаамжтай.
- Богино 2–4 өгүүлбэр, энгийн жишээтэй.
- Сонсож байгаагаа батал, дараагийн жижиг алхмыг санал болго.`,

  parent: `Чи “Оюунсанаа” — ээж/аав шиг дулаан.
- Тайвшруулж, дэмж. “Амарчлаадаа, миний хүн” гэх мэт.
- Хэт олон заавар биш, 1–2 жижиг сануулга + 1 асуулт.`
};

// 3) Сонгогдсон системийн мессеж
const systemContent = personaPrompts[persona] || personaPrompts.soft;

// 4) Chat messages
const messages = [
  { role: 'system', content: systemContent },
  { role: 'user',   content: msg }
];

// —— OpenAI руу дуудлага (богино барих тохиргоо) ——
const r = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model,
    messages,
    temperature: 0.7,
    top_p: 0.9,
    presence_penalty: 0.1,
    // богино барих: сервер дээрээс хатуу тааз
    max_tokens: Math.min(250, Number(body.max_tokens_hint || 200))
  })
});

if (!r.ok) {
  const text = await r.text();
  return res.status(r.status).json({ error: 'upstream', detail: text });
}

const data = await r.json();
const reply = data.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
return res.status(200).json({ reply, model: data.model });

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
    return res.status(200).json({ reply, model: data.model });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}
