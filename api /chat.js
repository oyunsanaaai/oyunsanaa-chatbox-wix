// api/chat.js
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, ping: "pong" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { moduleId = "psychology", text = "", images = [], chatHistory = [], userLang } = body;

    const use4o = images?.length > 0 || (text && text.length > 300);
    const model = use4o ? "gpt-4o" : "gpt-4o-mini";

    const messages = [
      { role: "system", content: `You are OY assistant for module: ${moduleId}. Answer in ${userLang || 'mn'}.` },
      {
        role: "user",
        content: [
          { type: "text", text },
          ...images.map((d) => ({ type: "image_url", image_url: { url: d } })),
        ],
      },
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
    });

    const j = await r.json();
    const reply = j.choices?.[0]?.message?.content?.trim() || "…";
    return res.status(200).json({ ok: true, reply, model });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
