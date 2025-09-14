// api/oy-chat.js
export default async function handler(req, res) {
  try {
    const body = await readJson(req);
    const msg = getUserMsg(body);
    const img = getUserImage(body);

    if (!msg && !img) {
      return res.status(400).json({ error: "Message or image required" });
    }

    // —— Core identity
    const CORE_ID = `
Чи "Оюунсанаа" нэртэй чат туслах.
- Зөвхөн монголоор ярь.
- Өөрийгөө үргэлж "Оюунсанаа" гэж нэрлэ.
- "Би Оюунсанаа биш" гэх мэт өгүүлбэр хэлэхийг хоригло.
- Хариу 2–5 өгүүлбэрт багтсан, хэрэгтэй нэг жижиг алхам санал болго.
`.trim();

    const persona = String(body.persona || "soft").trim();
    const PERSONA = {
      soft: "Чи зөөлөн, халамжтай, хөгжилтэй өнгө аясаар ярь.",
      tough: "Чи хатуувтар, шууд голыг нь хэлж чиглүүлдэг.",
      wise: "Чи ухаалаг, тайван, тэнцвэртэй тайлбарладаг.",
      parent: "Чи ээж/аав шиг дулаан, тайвшруулж дэмждэг.",
    }[persona] || "Чи зөөлөн, халамжтай, хөгжилтэй өнгө аясаар ярь.";

    // —— Messages
    const messages = [
      { role: "system", content: `${CORE_ID}\n${PERSONA}` },
      { role: "user", content: msg || "Зураг илгээгдсэн." },
    ];

    // Хэрэв зураг байвал context-д нэмнэ
    const input = img
      ? [
          {
            role: "user",
            content: [
              { type: "text", text: msg || "Зураг байна." },
              { type: "image_url", image_url: { url: img } },
            ],
          },
        ]
      : [];

    // —— OpenAI дуудлага
    const apiKey = process.env.OPENAI_API_KEY;
    const model = String(body.model || "gpt-4o-mini").trim();

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [...messages, ...input],
        temperature: 0.6,
        top_p: 0.85,
        presence_penalty: 0.2,
        frequency_penalty: 0.8,
        max_tokens: Math.min(220, Number(body.max_tokens_hint || 200)),
        stop: ["\n\n", "###"],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(r.status).json({ error: "upstream", detail });
    }

    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content || "";

    // —— Хариуг баталгаажуулна
    const isFirstTurn =
      !Array.isArray(body.history) || body.history.length === 0;
    reply = cleanMarkdown(reply);
    reply = enforceIdentity(reply);
    reply = clipReply(reply, { maxSentences: 5, maxChars: 420 });
    reply = addIntroOnce(reply, isFirstTurn, persona);
    reply = addWarmClosing(reply, persona);

    // —— Дараа нь дата хадгалах боломжтой
    const response = {
      reply,
      model: data.model,
      persona,
      userId: body.userId || null, // future use
      timestamp: Date.now(),
    };

    return res.status(200).json(response);
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "server", detail: String(e?.message || e) });
  }
}

/* ========= Helpers ========= */
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const text = await new Response(req.body || null).text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}
function getUserMsg(body) {
  if (typeof body?.msg === "string") return body.msg.trim();
  if (Array.isArray(body?.messages)) {
    const u = body.messages.find((m) => m?.role === "user")?.content;
    if (typeof u === "string") return u.trim();
  }
  return "";
}
function getUserImage(body) {
  if (typeof body?.image === "string") return body.image.trim();
  return null;
}
function cleanMarkdown(s = "") {
  return String(s)
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function clipReply(s, { maxSentences = 5, maxChars = 420 } = {}) {
  let t = s.trim();
  const parts = t.split(/(?<=[\.!?…])\s+|\n+/).filter(Boolean);
  t = parts.slice(0, maxSentences).join(" ");
  if (t.length > maxChars)
    t = t.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  return t;
}
function addIntroOnce(s, isFirst, persona) {
  if (!isFirst) return s;
  const head = {
    soft: "Би Оюунсанаа. Би ойлгож байна. ",
    tough: "Би Оюунсанаа. Ойлголоо. ",
    wise: "Би Оюунсанаа. Сайн байна, ойлголоо. ",
    parent: "Би Оюунсанаа. Зүгээр дээ. ",
  }[persona] || "Би Оюунсанаа. Ойлголоо. ";
  return head + s;
}
function addWarmClosing(s, persona) {
  const end =
    persona === "tough"
      ? " Одоо нэг жижиг алхмаар эхэлье?"
      : persona === "parent"
      ? " Өнөөдөр өөртөө багахан ч гэсэн анхаараарай. 😊"
      : persona === "wise"
      ? " Бэлэн бол дараагийн жижиг хэсгийг тодруулъя."
      : " Хүсвэл цааш ярилцъя. 💬";
  return /[?!]$/.test(s) ? s : s + end;
}
function enforceIdentity(s = "") {
  const bad = /(би\s+оюунсанаа\s+биш|I\s*am\s*not\s*Oyunsanaa)/i;
  if (bad.test(s)) s = s.replace(bad, "Би Оюунсанаа.");
  s = s.replace(/\b(GPT|assistant|чатбот)\b/gi, "Оюунсанаа");
  return s.trim();
}
