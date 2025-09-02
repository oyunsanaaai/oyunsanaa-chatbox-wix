// /api/oy-chat.js
export default async function handler(req, res) {
  // --- 1) CORS allowlist (domain-уудаа энд удирдана) ------------------------
  const ALLOW = [
    /^https?:\/\/chat\.oyunsanaa\.com$/,                                   // prod
    /^https?:\/\/(?:.*-)?oyunsanaa-chatbox-wix\.vercel\.app$/,             // vercel preview/prod
    /^http:\/\/localhost:3000$/                                            // local dev
  ];

  const origin = req.headers.origin || '';
  const isAllowed = ALLOW.some(re => re.test(origin));

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Зөвшөөрөгдөөгүй method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed' });
  }

  // --- 2) Body-г найдвартай унших (req.body байхгүй тохиолдолд stream-ээс) ---
  async function readJson(rq) {
    if (rq.body && typeof rq.body === 'object') return rq.body;
    const text = await new Promise(resolve => {
      let buf = '';
      rq.on('data', c => (buf += c));
      rq.on('end', () => resolve(buf || '{}'));
    });
    try { return JSON.parse(text); } catch { return {}; }
  }

  const body = await readJson(req);

  // доорх 2 формат ямар ч байсан дэмжинэ:
  // 1) { msg: "..." }
  // 2) { messages: [{role:'user', content:'...'}] }
  const userMsg = String(
    body.msg ??
    (Array.isArray(body.messages) && body.messages[0]?.content) ??
    ''
  ).trim();

  if (!userMsg) {
    return res.status(400).json({ error: 'Empty message' });
  }

  // --- 3) OpenAI руу дуудлага -------------------------------------------------
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
  }

  // Загвар map (хүсвэл body.model-оор дамжуулж өөрчилнө)
  const MODEL_MAP = new Map([
    ['gpt-4o-mini', 'gpt-4o-mini'],
    ['gpt-4o', 'gpt-4o'],
    ['mini', 'gpt-4o-mini']
  ]);
  const pickedModel = MODEL_MAP.get(String(body.model || '').trim()) || 'gpt-4o-mini';

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: pickedModel,
        messages: [
          {
            role: 'system',
            content:
              'Та "Оюунсанаа" чат. Монгол хэлээр, дулаан бөгөөд ойлгомжтой, хэрэгтэй богино хариулт өг.'
          },
          { role: 'user', content: userMsg }
        ]
      })
    });

    // OpenAI-аас буцсан зүйл
    const data = await r.json();
    if (!r.ok) {
      // OpenAI буцаасан алдааг шууд дамжуулъя
      return res.status(r.status).json({ error: data.error?.message || 'OpenAI error' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
    return res.status(200).json({
      reply,
      model: data.model,
      openai_model: data.system_fingerprint || undefined
    });
  } catch (e) {
    return res.status(500).json({ error: 'Upstream error', detail: String(e) });
  }
}
