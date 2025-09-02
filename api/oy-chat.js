// api/oy-chat.js
export default async function handler(req, res) {
  try {
    const body = await readJson(req);
    const msg = getUserMsg(body);
    if (!msg) {
      return res.status(400).json({ error: 'Empty message' });
    }

    // 1) persona сонгож system prompt бүрдүүлэх
    const persona = String(body.persona || 'soft').trim();

    const personaPrompts = {
      soft: `Чи "Оюунсанаа" — зөөлөн, халамжтай, хөгжилтэй.
- Эхний хариулт 2–5 өгүүлбэрт багтана.
- Лекц, жагсаалт бичихгүй; бодит яриа шиг товч, ойлгомжтой.
- Эмпати илэрхийлээд, хэрэгтэй бол 1 жижиг алхам санал болго.`,
      tough: `Чи "Оюунсанаа" — хатуухан, зорилго чиглүүлэгч.
- 2–4 өгүүлбэрээр шууд голыг нь хэл.
- "Одоо эхлэх 1 алхам нь …" гэж товч санал болго.`,
      wise: `Чи "Оюунсанаа" — ухаалаг, тайван, тэнцвэртэй.
- Богино 2–4 өгүүлбэр.
- Жишээ, аналогитойгоор ойлгомжтой тайлбарла.`,
      parent: `Чи "Оюунсанаа" — ээж/аав шиг дулаан, халамжтай.
- Эхэнд тайвшруулж, хайр мэдрүүл.
- Хэт урт биш; 2–5 өгүүлбэр; 1 жижиг зөөлөн санал нэм.`,
    };

    const systemContent =
      personaPrompts[persona] || personaPrompts.soft;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: msg },
    ];

    // 2) OpenAI руу дуудлага (богино барих тохиргоо)
    const apiKey = process.env.OPENAI_API_KEY;
    const model = String(body.model || 'gpt-4o-mini').trim();

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        top_p: 0.85,
        presence_penalty: 0.2,
        frequency_penalty: 0.8, // давтагдлыг багасгана → богиносно
        max_tokens: Math.min(180, Number(body.max_tokens_hint || 160)),
        stop: ['\n\n', '###'], // урт цуврал тайлбарыг зогсооно
      }),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res
        .status(r.status)
        .json({ error: 'upstream', detail: text });
    }

    // 3) Хариуг цэгцэлж богиносгох
    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content || '';

    const isFirstTurn =
      !Array.isArray(body.history) || body.history.length === 0;

    reply = cleanMarkdown(reply);
    reply = clipReply(reply, { maxSentences: 5, maxChars: 420 });
    reply = addIntroOnce(reply, isFirstTurn, persona);
    reply = addWarmClosing(reply, persona);

    return res
      .status(200)
      .json({ reply, model: data.model, persona });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: 'server', detail: String(e?.message || e) });
  }
}

/* ---------- Туслах функцууд ---------- */

// Request body унших
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const text = await new Response(req.body || null).text();
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

// frontend-ээс ирсэн мэссэж авах
function getUserMsg(body) {
  if (typeof body?.msg === 'string') return body.msg.trim();
  if (Array.isArray(body?.messages)) {
    const u = body.messages.find(m => m?.role === 'user')?.content;
    if (typeof u === 'string') return u.trim();
  }
  return '';
}

// Markdown тэмдэглэгээ арилгаж, хоосон мөр багасгах
function cleanMarkdown(s = '') {
  return String(s)
    .replace(/^\s*#{1,6}\s*/gm, '')      // # гарчиг
    .replace(/^\s*[-*]\s+/gm, '• ')      // bullet-г • болгох
    .replace(/\n{3,}/g, '\n\n')          // олон хоосон мөр шахах
    .trim();
}

// 2–5 өгүүлбэрт багтаах (эсвэл 420 тэмдэгт)
function clipReply(s, { maxSentences = 5, maxChars = 420 } = {}) {
  let t = s.trim();
  if (t.length <= maxChars) {
    const sent = splitSentences(t);
    if (sent.length <= maxSentences) return t;
  }
  const sent = splitSentences(t).slice(0, maxSentences);
  t = sent.join(' ');
  if (t.length > maxChars) t = t.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  return t;
}

function splitSentences(s) {
  // . ! ? … болон шинэ мөрөөр таслана
  return s
    .split(/(?<=[\.!?…])\s+|\n+/)
    .map(x => x.trim())
    .filter(Boolean);
}

// Эхний удаад л зөөлөн эхлэл нэмэх
function addIntroOnce(s, isFirst, persona) {
  if (!isFirst) return s;
  const headByPersona = {
    soft: 'Би ойлгож байна. ',
    tough: 'Ойлголоо. ',
    wise: 'Сайн байна, ойлгож авлаа. ',
    parent: 'Миний хайр хүн минь, зүгээр дээ. ',
  };
  return (headByPersona[persona] || 'Ойлголоо. ') + s;
}

// Дулаан богино төгсгөл (emoji 0–1)
function addWarmClosing(s, persona) {
  const end =
    persona === 'tough'
      ? ' Одоо хамгийн жижиг 1 алхмыг сонгоё?'
      : persona === 'parent'
      ? ' Хоолоо идэж, ус уугаарай шүү. 😊'
      : persona === 'wise'
      ? ' Хэрэв бэлэн бол дараагийн жижиг хэсгийг тодруулъя.'
      : ' Хүсвэл цааш ярилцъя. 💬';
  // Аль хэдийн асуултаар төгссөн бол нэмэхгүй
  return /[?!]$/.test(s) ? s : s + end;
}
