// CommonJS хувилбар (Vercel-д илүү найдвартай)
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function handler(req, res) {
  const allowList = [
    "https://www.oyunsanaa.com",
    "https://oyunsanaa.com",
    "https://chat.oyunsanaa.com",
    "https://oyunsanaa-chatbox-wix.vercel.app"
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const msg = body.msg || "";
    const img = body.img || "";
    const persona = (body.persona || "soft").trim();
    let model = (body.model || "").trim();

    // 🧠 Автомат model сонгоно:
    // зураг байвал gpt-4o, зүгээр текст байвал gpt-4o-mini
    if (!model) {
      model = img ? "gpt-4o" : "gpt-4o-mini";
    }

    const CORE_ID = "Та Оюунсанаа — сэтгэлийн боловсрол, өдөр тутмын туслагч AI...";
    const PERSONA_MAP = {
      soft: "Чи зөөлөн, халамжтай өнгөөр ярь.",
      wise: "Чи нам гүм, ухаалаг тайван өнгөөр ярь.",
      parent: "Чи дулаан, ээж шиг дэмжих өнгөөр ярь."
    };
    const PERSONA = PERSONA_MAP[persona] || PERSONA_MAP.soft;

    const messages = [
      { role: "system", content: `${CORE_ID}\n${PERSONA}` },
      { role: "user", content: msg }
    ];

    // 🖼 Хэрэв зураг байвал нэм
    if (img) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: msg },
          { type: "image_url", image_url: { url: img } }
        ]
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply, model });

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
};
