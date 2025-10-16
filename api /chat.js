// /api/chat.js  — Vercel (Edge/Node аль алинд нядрана)
export const config = { runtime: "edge" };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://chat.oyunsanaa.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export default async function handler(req) {
  const CORS = corsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405, headers: CORS
    });
  }

  try {
    const { text = "", images = [], moduleId = "psychology", chatHistory = [] } = await req.json();

    // --- Model router
    const hasImage = Array.isArray(images) && images.length > 0;
    const wc = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const isLong = (text?.length || 0) >= 800 || wc >= 120;
    const model = (hasImage || isLong) ? "gpt-4.0" : "gpt-4.0-mini";

    // --- Persona per module (optional)
    const PERSONA = {
      psychology:   "You are Oyunsanaa, a warm psychology coach.",
      health:       "You are a balanced health & wellness coach.",
      finance:      "You are a practical personal finance coach.",
      goals:        "You are a goals & productivity coach.",
      relationships:"You are a relationship & communication coach.",
      environment:  "You are a habits & environment coach.",
      reminder:     "You help set reminders and journaling.",
      "mental-edu": "You teach mental education step-by-step with exercises."
    };

    // --- Build multimodal content
    const content = [];
    if (text) content.push({ type: "text", text });
    for (const u of images) {
      if (u) content.push({ type: "image_url", image_url: { url: u } }); // supports data:... or https://
    }

    const messages = [
      { role: "system", content: PERSONA[moduleId] || "You are Oyunsanaa." },
      ...chatHistory,
      { role: "user", content }
    ];

    // --- Call OpenAI
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "…";

    return new Response(JSON.stringify({ ok: true, model, reply }), { status: 200, headers: CORS });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500, headers: CORS });
  }
}
