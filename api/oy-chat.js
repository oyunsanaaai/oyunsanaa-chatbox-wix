// api/oy-chat.js
export default async function handler(req, res) {
  try {
    // --- CORS (Wix/өөр домэйнд хэрэгтэй бол) ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'missing_key', hint: 'OPENAI_API_KEY is not set' });
    }

    const body = await readJson(req);
    const msg = getUserMsg(body);
    if (!msg) return res.status(400).json({ error: 'empty_message' });

    // persona
    const persona = String(body.persona || 'soft').trim();
    const personaPrompts = {
      soft: `Чи "Оюунсанаа" — ...`,
      tough: `Чи "Оюунсанаа" — ...`,
      wise:  `Чи "Оюунсанаа" — ...`,
      parent:`Чи "Оюунсанаа" — ...`,
    };
    const systemContent = personaPrompts[persona] || personaPrompts.soft;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: msg },
    ];

    const model = (body.model || 'gpt-4o-mini').trim();

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
        frequency_penalty: 0.8,
        max_tokens: Math.min(180, Number(body.max_tokens_hint || 160)),
        stop: ['\n\n', '###'],
      }),
    });

    const txt = await r.text(); // аль ч тохиолдолд уншчихъя
    if (!r.ok) {
      // OpenAI-аас ирсэн алдааг шууд харуулна
      return res.status(r.status).json({ error: 'upstream', detail: safeJson(txt) });
    }

    const data = safeJson(txt);
    let reply = data?.choices?.[0]?.message?.content || '';

    const isFirstTurn = !Array.isArray(body.history) || body.history.length === 0;
    reply = addWarmClosing(clipReply(cleanMarkdown(reply), { maxSentences: 5, maxChars: 420 }), persona);
    if (isFirstTurn) reply = addIntroOnce(reply, true, persona);

    return res.status(200).json({ reply, model: data?.model || model, persona });
  } catch (e) {
    console.error('oy-chat fatal:', e);
    return res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}

function safeJson(t){ try { return JSON.parse(t); } catch { return { raw:t }; } }
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { const text = await new Response(req.body || null).text(); return JSON.parse(text||'{}'); }
  catch { return {}; }
}
function getUserMsg(body) {
  if (typeof body?.msg === 'string') return body.msg.trim();
  if (Array.isArray(body?.messages)) {
    const u = body.messages.find(m => m?.role === 'user')?.content;
    if (typeof u === 'string') return u.trim();
  }
  return '';
}
function cleanMarkdown(s=''){ return s.replace(/^\s*#{1,6}\s*/gm,'').replace(/^\s*[-*]\s+/gm,'• ').replace(/\n{3,}/g,'\n\n').trim(); }
function splitSentences(s){ return s.split(/(?<=[\.!?…])\s+|\n+/).map(x=>x.trim()).filter(Boolean); }
function clipReply(s,{maxSentences=5,maxChars=420}={}){ let t=s.trim(); const S=splitSentences(t); t=S.slice(0,maxSentences).join(' '); if(t.length>maxChars) t=t.slice(0,maxChars).replace(/\s+\S*$/,'')+'…'; return t; }
function addIntroOnce(s,isFirst,persona){ if(!isFirst) return s; const m={soft:'Би ойлгож байна. ',tough:'Ойлголоо. ',wise:'Сайн байна, ойлгож авлаа. ',parent:'Миний хайр хүн минь, зүгээр дээ. '}; return (m[persona]||'Ойлголоо. ')+s; }
function addWarmClosing(s,persona){ const end= persona==='tough'?' Одоо хамгийн жижиг 1 алхмыг сонгоё?': persona==='parent'?' Хоолоо идэж, ус уугаарай шүү. 😊': persona==='wise'?' Хэрэв бэлэн бол дараагийн жижиг хэсгийг тодруулъя.':' Хүсвэл цааш ярилцъя. 💬'; return /[?!]$/.test(s)?s:s+end; }
