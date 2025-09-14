// api/oy-chat.js — Oyunsanaa (Vision + Persona + Identity + CORS)

export default async function handler(req, res) {
  try {
    // --- [CORS: Wix-ээс шууд дуудах үед хэрэг болно; нэг домэйнд байвал зүгээр] ---
    res.setHeader('Access-Control-Allow-Origin', '*'); // эсвэл өөрийн домэйноо тавьж болно
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const body = await readJson(req);
    const msg = getUserMsg(body);
    if (!msg) return res.status(400).json({ error: 'Empty message' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'missing_key', hint: 'OPENAI_API_KEY' });

    // ==== CORE IDENTITY (Оюунсанаа өөрийгөө танина) ====
    const CORE_ID = `
Чи "Оюунсанаа" нэртэй чат туслах.
- Зөвхөн монголоор ярь.
- Өөрийгөө үргэлж "Оюунсанаа" гэж нэрлэ. "Би Оюунсанаа биш" гэх үгсийг хэлж болохгүй.
- Хариу 2–5 өгүүлбэрт багтсан, эелдэг, хэрэгтэй нэг жижиг алхам санал болгох маяг баримтал.
- Хэрэглэгчийг шахахгүй; сонголтыг нь хүндэлж, урам өг.
- Хэт урт жагсаалт, лекц маягийн бичвэрээс зайлсхий.
`.trim();

    // ==== PERSONA ====
    const persona = String(body.persona || 'soft').trim();
    const PERSONA =
      persona === 'tough'  ? 'Чи хатуувтар, шууд голыг нь хэлж чиглүүлдэг.' :
      persona === 'wise'   ? 'Чи ухаалаг, тайван, тэнцвэртэй тайлбарладаг.' :
      persona === 'parent' ? 'Чи ээж/аав шиг дулаан, тайвшруулж дэмждэг.' :
                              'Чи зөөлөн, халамжтай, хөгжилтэй өнгө аясаар ярь.';

    // ==== KNOWLEDGE (шийдвэргүй бол хоосон үлдээнэ) ====
    // Хожим /knowledge/oy.md файл нэмчихээд loadKnowledge() дуудаж context холбоно.
    const context = ''; // await loadKnowledge();

    // ==== IMAGES (Vision) ====
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const hasImages = images.length > 0;

    // ==== MESSAGES ====
    const systemMessage = {
      role: 'system',
      content: [CORE_ID, PERSONA, context ? `\n[Context]\n${context}` : ''].join('\n')
    };

    let userMessage;
    if (hasImages) {
      // dataURL эсвэл absolute URL-уудыг image_url формат руу хөрвүүлнэ
      const imageParts = images.map(u => ({
        type: 'image_url',
        image_url: { url: String(u) } // data:image/...;base64,*** байж болно
      }));
      userMessage = { role: 'user', content: [{ type: 'text', text: msg }, ...imageParts] };
    } else {
      userMessage = { role: 'user', content: msg };
    }

    const messages = [systemMessage, userMessage];

    // ==== MODEL сонголт ====
    // Зурагтай бол заавал 4o (Vision), зураггүй бол ирсэн model-ийг хэрэглэнэ (анхдагч 4o-mini)
    const clientModel = String(body.model || '').trim();
    const model = hasImages ? 'gpt-4o' : (clientModel || 'gpt-4o-mini');

    // ==== OpenAI дуудлага ====
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        top_p: 0.85,
        presence_penalty: 0.2,
        frequency_penalty: 0.8,
        max_tokens: Math.min(180, Number(body.max_tokens_hint || 160)),
        stop: ['\n\n', '###']
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'upstream', detail });
    }

    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content || '';

    // ==== Хариуг цэгцэлж, identity-г бататгах ====
    const isFirstTurn = !Array.isArray(body.history) || body.history.length === 0;
    reply = cleanMarkdown(reply);
    reply = enforceIdentity(reply);
    reply = clipReply(reply, { maxSentences: 5, maxChars: 420 });
    reply = addIntroOnce(reply, isFirstTurn, persona);
    reply = addWarmClosing(reply, persona);

    return res.status(200).json({ reply, model: data.model || model, persona });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}

/* ========= Helpers ========= */

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const text = await new Response(req.body || null).text();
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}
function getUserMsg(body) {
  if (typeof body?.msg === 'string') return body.msg.trim();
  if (Array.isArray(body?.messages)) {
    const u = body.messages.find(m => m?.role === 'user')?.content;
    if (typeof u === 'string') return u.trim();
  }
  return '';
}
function cleanMarkdown(s='') {
  return String(s)
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function clipReply(s, { maxSentences=5, maxChars=420 } = {}) {
  let t = s.trim();
  const parts = t.split(/(?<=[\.!?…])\s+|\n+/).filter(Boolean);
  t = parts.slice(0, maxSentences).join(' ');
  if (t.length > maxChars) t = t.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  return t;
}
function addIntroOnce(s, isFirst, persona) {
  if (!isFirst) return s;
  const head = {
    soft:   'Би Оюунсанаа. Би ойлгож байна. ',
    tough:  'Би Оюунсанаа. Ойлголоо. ',
    wise:   'Би Оюүнсанаа. Сайн байна, ойлголоо. ',
    parent: 'Би Оюүнсанаа. Зүгээр дээ. '
  }[persona] || 'Би Оюунсанаа. Ойлголоо. ';
  return head + s;
}
function addWarmClosing(s, persona) {
  const end =
    persona === 'tough'  ? ' Одоо нэг жижиг алхмаар эхэлье?' :
    persona === 'parent' ? ' Өнөөдөр өөртөө багахан ч гэсэн анхаараарай. 😊' :
    persona === 'wise'   ? ' Бэлэн бол дараагийн жижиг хэсгийг тодруулъя.' :
                           ' Хүсвэл цааш ярилцъя. 💬';
  return /[?!]$/.test(s) ? s : s + end;
}
function enforceIdentity(s='') {
  const bad = /(би\s+оюунсанаа\s+биш|I\s*am\s*not\s*Oyunsanaa)/i;
  if (bad.test(s)) s = s.replace(bad, 'Би Оюунсанаа.');
  s = s.replace(/\b(GPT|assistant|чатбот)\b/gi, 'Оюунсанаа');
  return s.trim();
}

/*
// Хэрэв дараа нь төслийн танилцуулга/FAQ-г файлд бичиж уншуулах бол:
// 1) репо-доо knowledge/oy.md үүсгээд хэдхэн догол мөр танилцуулгаа бич
// 2) дээр context-д loadKnowledge() дуудаж холбо

import fs from 'node:fs/promises';
async function loadKnowledge(){
  try{
    return await fs.readFile(process.cwd() + '/knowledge/oy.md', 'utf8');
  }catch{ return ''; }
}
*/
