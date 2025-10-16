// api/chat.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "https://chat.oyunsanaa.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ ok:false, error:"Method not allowed" }), { status:405, headers:cors });

  try {
    const { text = "", images = [], moduleId = "psychology", chatHistory = [] } = await req.json();

    // ——— модель сонголт
    const wc = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const isLong = (text?.length || 0) >= 800 || wc >= 120;
    const useVision = Array.isArray(images) && images.length > 0;
    const model = (useVision || isLong) ? "gpt-4.0" : "gpt-4.0-mini";

    // ——— системийн persona (модуль бүрт өөр өнгө ая)
    const PERSONA = {
      psychology:  "You are Oyunsanaa, a warm psychology coach.",
      health:      "You are a balanced health & wellness coach.",
      finance:     "You are a practical personal finance coach.",
      goals:       "You are a goals & productivity coach.",
      relationships:"You are a relationship & communication coach.",
      environment: "You are a habits & environment coach.",
      reminders:   "You help set reminders and keep people accountable.",
      journal:     "You are a reflective journaling companion."
    };

    // ——— OpenAI payload (Vision data URL / URL хоёуланг дэмжинэ)
    const content = [];
    if (text) content.push({ type:"text", text });
    for (const u of images || []) {
      if (!u) continue;
      content.push({ type:"image_url", image_url:{ url: u } }); // data:... эсвэл https://...
    }

    const messages = [
      { role:"system", content: PERSONA[moduleId] || "You are Oyunsanaa." },
      ...chatHistory,
      { role:"user", content }
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    });
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ ok:true, model, reply }), { status:200, headers:cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok:false, error:"Server error" }), { status:500, headers:cors });
  }
}
