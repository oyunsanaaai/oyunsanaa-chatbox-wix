export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const msg = body.msg || '';

    if (!msg) {
      return res.status(400).json({
        error: 'Empty message',
        hint: 'Send {"msg":"..."}'
      });
    }

    // ===== Persona + system prompt =====
    const persona = String(body.persona || '').trim() || 'soft';

    const personaPrompts = {
      soft: `Чи "Оюунсанаа" — зөөлөн, халамжтай, хөгжилтэй. 
      2–6 өгүүлбэрээр богино хариулт өг. 
      Хэт урт лекц бүү бич. Амьд ярианы өнгө, сэтгэл тайвшруулсан байг.`,
      - Эмпати илэрхийл: “ойлгож байна”, “санаа зоволтгүй ээ” гэх мэт.
      - Онош тавих, эмчилгээ бичихгүй; шаардлагатай бол мэргэжилтэн рүү соёлтой чиглүүл.`,   
      tough: `Чи "Оюунсанаа" — хатуу чанга, зорилго чиглүүлэгч. 
      2–4 өгүүлбэр. Шийдэмгий, урам зориг өг.`,
      wise: `Чи "Оюунсанаа" — ухаалаг, тайван, гүнзгий. 
      Богино мөрөнд 2–4 өгүүлбэр, ойлгомжтой тайлбар хий.`,
      - Энгийн жишээгээр тайлбарла.`,
      parent: `Чи "Оюунсанаа" — ээж/аав шиг дулаан, халамжтай. 
      2–4 өгүүлбэрээр хайр халамж, урам өг.
      - Эхэнд нь тайвшруул, хайр мэдрүүл.
      - Хэт хатуу биш; зөөлөн сануулга ба жижиг даахуйц алхам санал болго.`,  
      };

    const systemContent = personaPrompts[persona] || personaPrompts.soft;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: msg }
    ];

    // ===== OpenAI дуудлага =====
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages,
        temperature: 0.6,
        top_p: 0.8,
        presence_penalty: 0.3,
        frequency_penalty: 1.0,
        max_tokens: Math.min(180, Number(body.max_tokens_hint || 160)),
        stop: ["\n\n", "###"]
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'upstream', detail: text });
    }

    // ===== Хариулт боловсруулах =====
    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content || '';

    reply = reply
      .replace(/^\s*(#+|[-*]+)\s*/gm, '')  // heading / bullet арилгах
      .replace(/\n{2,}/g, '\n')            // хоосон мөр цэгцлэх
      .trim();

    // Эхний мессеж бол танилцуулга нэм
    const isFirstTurn = !Array.isArray(body.history) || body.history.length === 0;
    reply = addIntroOnce(reply, isFirstTurn);
    reply = addWarmClosing(reply, persona);

    return res.status(200).json({ reply, model: data.model });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server', detail: String(e.message || e) });
  }
}

// ===== Helper functions =====
function addIntroOnce(text, isFirst) {
  if (!text) return '';
  if (!isFirst) return String(text);
  const intro = 'Сэтгэлийн туслах Оюунсанаа байна. Таньд юугаар туслах уу?';
  const t = String(text).trim();
  if (t.startsWith(intro)) return t;
  return `${intro} ${t}`;
}

function addWarmClosing(text, persona = 'soft') {
  const closings = {
  soft:
      'Хэрвээ одоо жаахан хэцүү байвал амсхаад аваарай. ' +
      'Дараагийн хоёр гурван алхмаа хамт тодруулья уу?'
      'Чи ганцаараа биш шүү. 😊',
      'Би чамтай хамт байна.',
      'Амар тайван амьсгалаад, цаашаа хамт алхъя.'
    tough:
      'Одоогоор нэг жижиг алхам сонгоод шууд хийе. ' +
      'Дуусмагц надад хэлээрэй, дараагийнхыг нь үргэлжлүүлье.'
      'Одоо жижигхэн 1 алхам хийе.',
      'Хойшлуулах тусам хэцүү болно, одоо эхэлье.',
      'Чи чадна—одоохондоо жижиг алхам хангалттай.'
    wise:
      'Өнөөдрийн мэдрэмж нь маргаашийн ухаарал болж хувирдаг. ' +
      'Чамд хамгийн үнэ цэнтэй санагдсан нэг санаагаа хэлэх үү?'
      'Одоогийн мэдрэмжээ анзаарч, нэг өгүүлбэрээр хэлээд үзье.',
      'Байдалд тайван хандаж, дараагийн жижиг алхмаа сонгоё.',
      'Тэвчээртэй байхад бүх зүйл тодорно.'
    parent:
      'Хоол унд, нойроо мартуузай, миний хамгийн үнэ цэнэтэй эрдэнэ  минь ээ. ' +
      'Одоо хамгийн их тайтгаруулах зүйл чамд юу вэ?' 
      'Өөрийгөө бага зэрэг хайрлаарай за.Чи бол онцгой нэгэн шүү 🤗',
      'Өнөөдөр жаахан амарчлаад, маргааш нь жижиг алхмаа хийнэ ээ.',
      'Өөрийгөө битгий зэмлээрэй, чи хангалттай хичээж байна.';
  const t = String(text || '').trim();
  const needPunct = !/[.!?…]$/.test(t);
  return `${t}${needPunct ? '.' : ''} ${closings[persona] || closings.soft}`;
}
