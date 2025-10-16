// api/chat.js
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET = амьд эсэх шалгах (404 оношлоход хэрэгтэй)
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, tip: "POST /api/chat" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const {
      text = "",
      images = [],          // dataURL-ууд (image/png;base64, …)
      chatHistory = [],     // [{role, content}]
      moduleId = "general",
      userLang = "mn"       // 'mn', 'en', 'ru', ...
    } = body;

    // Модель сонголт: зураг байвал 4o (Vision), эс бөгөөс 4o-mini
    const useVision = Array.isArray(images) && images.length > 0;
    const model = useVision ? "gpt-4o" : "gpt-4o-mini";

    // Системийн заавар: богино, туслах, хэл
    const sys = `
You are Oyunsanaa, a warm, concise assistant.
Always reply in the user's language: ${userLang}.
If images are provided, carefully analyze them (OCR + scene understanding) and cite what you see.
Keep answers compact but helpful. For long multi-step coaching, outline bullet steps.
Current module: ${moduleId}.
`.trim();

    // Messages барих
    const messages = [{ role: "system", content: sys }];

    // Өмнөх түүх
    if (Array.isArray(chatHistory)) {
      for (const m of chatHistory) {
        if (m && m.role && m.content) messages.push({ role: m.role, content: m.content });
      }
    }

    // Хэрэглэгчийн текст
    if (text) messages.push({ role: "user", content: text });

    // Зураг (Vision input)
    if (useVision) {
      // OpenAI vision-д олон дүрс явуулахын тулд content массив ашиглана
      const visionParts = images.map((d) => ({ type: "image_url", image_url: d }));
      messages.push({
        role: "user",
        content: visionParts
      });
    }

    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ ok: false, error: "openai_fail", detail: errText });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Хариу ирсэнгүй.";

    return res.status(200).json({ ok: true, reply, model });
  } catch (e) {
    console.error("API crash:", e);
    return res.status(500).json({ ok: false, error: "server_crash", detail: String(e?.message || e) });
  }
};
