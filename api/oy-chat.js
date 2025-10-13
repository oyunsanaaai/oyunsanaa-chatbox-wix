// CommonJS хувилбар — package.json-д "type":"module" шаардахгүй
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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const msg = body.msg || "";
    const img = body.img || "";
    const persona = String(body.persona || "soft").trim();
    const model = String(body.model || "gpt-4o-mini").trim();

    const CORE_ID = `
Та "Оюунсанаа" — сэтгэлийн боловсрол, өдөр тутмын туслагч AI.
Хүн биш, эмч биш; онош тавихгүй, эм бичихгүй.
Монгол хэлээр зөөлөн, ойлгомжтой ярь. Эмзэг сэдэвт мэргэжлийн тусламж санал болго.`.trim();

    const PERSONA_MAP = {
      soft: "Чи зөөлөн, халамжтай өнгөөр ярь.",
      wise: "Чи нам гүм, ухаалаг тайван өнгөөр ярь.",
      parent: "Чи дулаан, ээж шиг дэмжих өнгөөр ярь."
    };
    const PERSONA = PERSONA_MAP[persona] || PERSONA_MAP.soft;

    const messages = [
      { role: "system", content: `${CORE_ID}\n${PERSONA}` },
      { role: "user", content: msg || "Сайн уу" }
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
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        top_p: 0.85,
        presence_penalty: 0.2,
        frequency_penalty: 0.8,
        max_tokens: 250,
        messages: [...messages, ...input]
      })
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

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const reply = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message });
  }
}

