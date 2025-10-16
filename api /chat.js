// api/chat.js — Vercel Edge Function (Next.js API Routes-т ч явна)
export const config = { runtime: "edge" };

import OpenAI from "openai";

// Ангиллын систем prompt-ууд (товч дарсан moduleId-аас шалтгаалж дагалдана)
const MODULE_PROMPTS = {
  "psychology": "You are Oyunsanaa, a warm psychology coach.",
  "health": "You are a balanced health and wellness coach.",
  "finance": "You are a practical personal finance coach.",
  "goals": "You are a goals and productivity coach.",
  "relationships": "You are a relationship and communication coach.",
  "environment": "You are an environment and habit-building coach.",
  "reminders": "You help set reminders and keep people accountable.",
  "journal": "You are a reflective journaling companion.",
};

function pickModel({ text = "", images = [] }) {
  const hasImage = Array.isArray(images) && images.length > 0;
  const wc = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const isLong = (text?.length || 0) >= 800 || wc >= 120;
  if (hasImage || isLong) return "gpt-4.0";
  return "gpt-4.0-mini";
}

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "https://chat.oyunsanaa.com");
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req) {
  const res = new Response(null, { status: 200, headers: new Headers() });
  cors(res);

  if (req.method === "OPTIONS") return res;

  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: res.headers
    });

  try {
    const body = await req.json();
    const { text = "", images = [], moduleId = "psychology", chatHistory = [] } = body || {};

    const model = pickModel({ text, images });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // vision контент бэлдье
    const content = [];
    if (text) content.push({ type: "text", text });
    (images || []).forEach((u) => {
      if (u) content.push({ type: "image_url", image_url: { url: u } });
    });

    const messages = [
      { role: "system", content: MODULE_PROMPTS[moduleId] || "You are Oyunsanaa." },
      // хүсвэл чат түүхээ дамжуулж болно: [{role:'user',content:'...'}, ...]
      ...chatHistory,
      { role: "user", content }
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ ok: true, model, reply }), {
      status: 200,
      headers: res.headers,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
      headers: res.headers,
    });
  }
}
