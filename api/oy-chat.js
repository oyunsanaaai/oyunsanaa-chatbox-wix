// api/oy-chat.js  (trial шалгалт + квот нэмсэн бүрэн хувилбар)
const jwt = require('jsonwebtoken');
let kv = null;
try { kv = require('@vercel/kv'); } catch (_) { kv = null; }

module.exports = async function handler(req, res) {
  const allowList = [
    "https://www.oyunsanaa.com",
    "https://oyunsanaa.com",
    "https://chat.oyunsanaa.com",
    "https://oyunsanaa-chatbox-wix.vercel.app",
  ];
  const origin = req.headers.origin || "";
  const allowOrigin = allowList.includes(origin) ? origin : allowList[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // ---- Auth (member/trial) ----
    const cookie = String(req.headers.cookie || "");
    const token = cookie.split('; ').find(s => s.startsWith('os_auth='))?.split('=')[1];
    if (!token) return res.status(401).json({ error: "NO_TOKEN" });

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    // ---- Trial quota/time ----
    if (decoded.role === 'trial') {
      const max = Number(process.env.TRIAL_MAX_MSG || 15);
      const jti = decoded.jti || decoded.jwtid || token.slice(-24);
      let used = 0;

      if (kv && kv.incr) {
        used = await kv.incr(`trial:${jti}:used`);
        // 2 өдрийн дараа автоматаар цэвэрлэнэ
        if (used === 1 && kv.expire) await kv.expire(`trial:${jti}:used`, 172800);
      } else {
        // KV байхгүй бол хамгийн энгийн fallback: 1 л удаа зөвшөөрнө
        used = max + 1;
      }

      const remaining = Math.max(0, max - used);
      res.setHeader('X-Trial-Remaining', String(remaining));
      if (used > max) return res.status(402).json({ error: "TRIAL_QUOTA_EXCEEDED", remaining: 0 });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const msg = body.msg || "";
    const img = body.img || "";
    const persona = String(body.persona || "soft").trim();
    const model = String(body.model || "gpt-4o-mini").trim();

    const CORE_ID =
      "Та 'Оюунсанаа' — сэтгэлийн боловсрол, өдөр тутмын туслагч AI.";
    const PERSONA_MAP = {
      soft: "Чи зөөлөн, халамжтай өнгөөр ярь.",
      wise: "Чи нам гүм, ухаалаг тайван өнгөөр ярь.",
      parent: "Чи дулаан, ээж шиг дэмжих өнгөөр ярь.",
    };
    const PERSONA = PERSONA_MAP[persona] || PERSONA_MAP.soft;

    const messages = [
      { role: "system", content: `${CORE_ID}\n${PERSONA}` },
      { role: "user", content: msg || "Сайн уу" },
    ];
    const input = img
      ? [{ role: "user", content: [{ type: "image_url", image_url: { url: img } }] }]
      : [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        top_p: 0.85,
        presence_penalty: 0.2,
        frequency_penalty: 0.8,
        max_tokens: 250,
        messages: [...messages, ...input],
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const reply = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message });
  }
};
