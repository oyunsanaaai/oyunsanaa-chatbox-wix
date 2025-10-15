// CommonJS хувилбар — Vercel дээр найдвартай
const fetch = globalThis.fetch;

module.exports = async function handler(req, res) {
  // CORS – same-origin үед заавал биш, хэвээр үлдээвэл зүгээр
  const allowList = [
    "https://chat.oyunsanaa.com",
    "https://oyunsanaa.com",
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const msg     = body.msg || "";
    const persona = String(body.persona || "soft").trim();
    const model   = String(body.model || "gpt-4o-mini").trim();

    const CORE_ID = "Та Оюунсанаа — сэтгэлийн боловсролын өдөр тутмын туслагч AI...";

    const PERSONA_MAP = {
      soft:   "Чи зөөлөн, халамжтай өнгөөр ярь.",
      wise:   "Чи нам гүм, ухаалаг тайван өнгөөр ярь.",
      parent: "Чи дулаан, ээж шиг дэмжих өнгөөр ярь."
    };
    const personaText = PERSONA_MAP[persona] || PERSONA_MAP.soft;

    const messages = [
      {role:"system", content: `${CORE_ID}\n${personaText}`},
      {role:"user",   content: msg}
    ];

    // --- OpenAI Responses API (JSON) ---
    const apiKey = process.env.OPENAI_API_KEY;
    if(!apiKey) throw new Error("OPENAI_API_KEY тохируулаагүй");

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,  // "gpt-4o" эсвэл "gpt-4o-mini"
        input: [
          {role:"system", content: CORE_ID + " " + personaText},
          {role:"user", content: msg}
        ]
      })
    });

    if(!resp.ok){
      const t = await resp.text();
      return res.status(500).json({ error: `OpenAI error ${resp.status}: ${t}` });
    }
    const data = await resp.json();
    // text хариуг сугалж авах (responses формат)
    const reply = data.output_text || data.choices?.[0]?.message?.content || "(хоосон хариу)";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
};
