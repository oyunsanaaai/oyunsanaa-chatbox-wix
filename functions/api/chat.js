// functions/api/chat.js
export async function onRequestPost({ request, env }) {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { text = "", images = [], chatHistory = [], userLang = "mn" } = body;
  const needsVision = images && images.length > 0;
  const model = needsVision ? "gpt-4o" : "gpt-4o-mini";

  const userContent = [
    { type: "text", text },
    ...images.map((u) => ({ type: "image_url", image_url: { url: u } })) // URL эсвэл dataURL аль аль ажиллана
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `You are Oyunsanaa. User language: ${userLang}.` },
        ...chatHistory,
        { role: "user", content: userContent },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Upstream error", detail: data }), { status: 500 });
  }

  const reply = data?.choices?.[0]?.message?.content || "…";
  return new Response(JSON.stringify({ reply, model: data?.model || model }), {
    headers: { "Content-Type": "application/json" },
  });
}
