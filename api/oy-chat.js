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

    const messages = [
      { role: 'system', content: 'Та Оюунсанаа чат. Дулаахан, ойлгомжтойгоор тусал.' },
      { role: 'user', content: msg }
    ];

    // ── Call OpenAI ────────────────────────────────
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,                 // 'gpt-4o' эсвэл 'gpt-4o-mini'
        messages,
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'upstream', detail: text });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
    return res.status(200).json({ reply, model: data.model });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}
