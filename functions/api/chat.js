// Cloudflare Pages Functions — /api/chat (хялбар, ажилладаг хувилбар)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions = () => new Response(null, { status:204, headers:CORS });
export const onRequestGet     = () => new Response("Use POST /api/chat", { status:200, headers:CORS });

export async function onRequestPost({ request, env }) {
  const key = env.OPENAI_API_KEY;
  if (!key) return jerr(500, "OPENAI_API_KEY missing");

  const body     = await request.json().catch(()=> ({}));
  const text     = body?.text ?? "";
  const images   = Array.isArray(body?.images) ? body.images : [];
  const history  = Array.isArray(body?.chatHistory) ? body.chatHistory : [];
  const userLang = (body?.userLang || "mn").split("-")[0];
  if (!text && images.length===0) return jerr(400, "Empty message");

  const messages = [
    { role:"system", content:`You are Oyunsanaa. Reply in ${userLang}.` },
    ...history.map(h => ({ role:h.role, content:h.content })),
    { role:"user", content: text || " " }
  ];
  // Зураг байвал GPT-4o; зураггүй бол 4o-mini
  const model = images.length ? "gpt-4o" : "gpt-4o-mini-2024-07-18";

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model, messages })
    });
    const data = await r.json();
    if (!r.ok) return jerr(502, data?.error?.message || r.statusText);

    const reply = data?.choices?.[0]?.message?.content || "…";
    return jok({ reply, model });
  } catch (e) {
    return jerr(500, String(e?.message || e));
  }
}

function jok(o){ return new Response(JSON.stringify(o),{ status:200, headers:{...CORS,"Content-Type":"application/json"} }); }
function jerr(s,m){ return new Response(JSON.stringify({ error:m }),{ status:s, headers:{...CORS,"Content-Type":"application/json"} }); }
