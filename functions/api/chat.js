export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text = "", images = [], chatHistory = [], userLang = "mn" } = req.body || {};

    // --- ⚙️ Model сонгох нөхцөл ---
    const model =
      Array.isArray(images) && images.length > 0
        ? "gpt-4o"                // зураг илгээвэл 4.0
        : "gpt-4o-mini-2024-07-18"; // текст бол mini

    // --- 🧠 OpenAI API дуудлага ---
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          ...chatHistory,
          { role: "user", content: text || "(no text)" },
          ...(Array.isArray(images)
            ? images.map((img) => ({
                role: "user",
                content: [{ type: "image_url", image_url: img }]
              }))
            : [])
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", errText);
      return res.status(response.status).json({ error: "OpenAI request failed", details: errText });
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "⚠️ Хариу ирсэнгүй. API холболтоо шалгана уу.";

    // --- 🟢 Хариу буцаах ---
    return res.status(200).json({
      reply,
      model,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
}
