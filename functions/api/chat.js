// functions/api/chat.js
import { CORS, ok, err } from "../_utils.js";

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  const key = env.OPENAI_API_KEY;
  if (!key) return err(500, { error: "OPENAI_API_KEY missing" });

  let body = await request.json().catch(()=> ({}));
  const text    = body?.text || "";
  const images  = Array.isArray(body?.images) ? body.images : [];
  const history = Array.isArray(body?.chatHistory) ? body.chatHistory : [];
  const userLang = (body?.userLang || "mn").split("-")[0];

  if (!text && images.length === 0) return err(400, { error: "empty message" });

  // OpenAI messages формат болгож бэлдье
  const messages = [
    { role: "system", content: `You are Oyunsanaa, a helpful assistant. Reply in ${userLang}.` },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: text || " " }
  ];

  // Зураг ирвэл 4o, эс бөгөөс 4o-mini
  const model = images.length ? "gpt-4o" : "gpt-4o-mini-2024-07-18";

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages })
    });
    const data = await r.json();

    if (!r.ok) return err(502, { error: "Upstream error", detail: data });

    const reply = data?.choices?.[0]?.message?.content || "…";
    return ok({ reply, model });
  } catch (e) {
    return err(500, { error: String(e) });
  }
}
