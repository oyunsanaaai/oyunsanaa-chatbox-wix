// Cloudflare Pages Functions — /api/chat
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet() {
  return new Response("Use POST /api/chat", { status: 405, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    const key = env.OPENAI_API_KEY;
    if (!key)
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });

    const body = await request.json().catch(()=> ({}));
    const text       = body?.text ?? "";
    const images     = Array.isArray(body?.images) ? body.images : [];
    const chatHistory= Array.isArray(body?.chatHistory) ? body.chatHistory : [];
    const userLang   = body?.userLang || "mn";

    const needsVision = images.length > 0;
    const model = needsVision ? "gpt-4o" : "gpt-4o-mini";

    const userContent = [
      { type: "text", text },
      ...images.map(u => ({ type: "image_url", image_url: { url: u } }))
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `You are Oyunsanaa. User language: ${userLang}.` },
          ...chatHistory,
          { role: "user", content: userContent }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Upstream error", detail: data }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "…";
    return new Response(JSON.stringify({ reply, model: data?.model || model }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
}
