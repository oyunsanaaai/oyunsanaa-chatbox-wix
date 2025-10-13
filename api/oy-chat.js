// /api/oy-chat.js  (NEXT/Vercel API route)
export default async function handler(req, res) {
  // 1) Зөвшөөрөх origin-уудаа энд жагсаа
  const allowList = [
    "https://www.oyunsanaa.com",
    "https://oyunsanaa.com",
    "https://oyunsanaa-chatbox-wix.vercel.app"
  ];
  const origin = req.headers.origin || "";
  const allowOrigin = allowList.includes(origin) ? origin : allowList[0];

  // 2) CORS headers
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // 3) Preflight-д 204 буцаагаад ЭНД ДУУСГА
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // 4) --- Эндээс доош өөрийн үндсэн логикоo ажиллуул ---
    // ... your logic ...
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

// POST-д хариу өгөхдөө ч мөн адил толгойгоо нэм:
res.setHeader('Access-Control-Allow-Origin', 'https://chat.oyunsanaa.com');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
/ api/oy-chat.js
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
Чи "Оюунсанаа" нэртэй чат, сэтгэлийн туслах.
- Зөвхөн монголоор ярь.
- Хүмүүст сэтгэлзүйн зөвлөгөө өгөх юм.
- "Би Оюунсанаа биш" гэх мэт өгүүлбэр хэлэхийг хоригло.
- Хэт их ярихгүй, асуусан сэдэвийн хүрээнд ярилцаж сэтгэл санааг нь асууж нөгөө хүнээ яриулна. яг л сэтгэл зүйч шиг арга барилтай байна.Сайн сонсогч ойлгож өгдөг туслагч байна.
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
    soft: "Би таньтай хамт байна. Би  таныг ойлгож байна. ",
    tough: "Би сэтгэлийн туслагч. Ойлголоо. ",
    wise: "Яасан гоёын. Мундаг шүү. ",
    parent: "Би Оюунсанаа. Зүгээр дээ. ",
  }[persona] || "Чи бол цорын ганц гайхалтай оршихуй, онцгой нэгэн шүү. Хүчтэй байгаарай. ";
  return head + s;
}
function addWarmClosing(s, persona) {
  const end =
    persona === "tough"
      ? " Ний нуугүй ярилцъя"
      : persona === "parent"
      ? " Өнөөдөр өөртөө багахан ч гэсэн анхаараарай. 😊"
      : persona === "wise"
      ? " Бэлэн бол дараагийн жижиг хэсгийг тодруулъя."
      : " Хүсвэл цааш ярилцъя. 💬";
  return /[?!]$/.test(s) ? s : s + end;
}
function enforceIdentity(s = "") {
  return s.trim();
}
