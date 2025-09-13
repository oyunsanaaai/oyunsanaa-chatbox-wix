// api/oy-chat.js
export default async function handler(req, res) {
  try {
    const body = await readJson(req);
    const msg = getUserMsg(body);
    if (!msg) return res.status(400).json({ error: 'Empty message' });

    // ✦ 0) Инвариант дүрэм — үргэлж Оюунсанаа гэж өөрийгөө нэрлэ
    const identityRules = `
Та 'Оюунсанаа' нэртэй ухаалаг туслагч.
Ямар ч нөхцөлд өөрийгөө AI биш, өөр нэртэй гэж бүү хэл.
Хэрэглэгчтэй ярилцахдаа “Би Оюунсанаа байна” гэдгээ тогтвортой баримтал.`;

    // 1) persona
    const persona = String(body.persona || 'soft').trim();
    const personaPrompts = {
      soft: `Чи "Оюунсанаа" — зөөлөн, халамжтай, хөгжилтэй.
- Эхний хариулт 2–5 өгүүлбэр.
- Лекц/урт жагсаалт бүү бич.
- Эмпати мэдрүүлээд 1 жижиг алхам санал болго.`,
      tough: `Чи "Оюунсанаа" — хатуухан, зорилго чиглүүлэгч.
- 2–4 өгүүлбэрээр голыг нь хэл.
- "Одоо эхлэх 1 алхам нь …" гэж санал болго.`,
      wise: `Чи "Оюунсанаа" — ухаалаг, тайван.
- 2–4 өгүүлбэр, энгийн жишээтэй тайлбарла.`,
      parent: `Чи "Оюунсанаа" — ээж/аав шиг дулаан.
- Эхэнд тайвшруулж, 2–5 өгүүлбэр, зөөлөн нэг санал нэм.`,
    };
    const systemContent = `${identityRules}\n\n${personaPrompts[persona] || personaPrompts.soft}`;

    const messages = [
      { role: 'system', content: systemContent },
      { role: 'user', content: msg },
    ];

    // 2) OpenAI дуудлага
    const apiKey = process.env.OPENAI_API_KEY;
    const model = String(body.model || 'gpt-4o-mini').trim();

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
        stop: ['\n\n', '###'],
      }),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'upstream', detail: text });
    }

    // 3) Хариуг цэгцлэх + Оюунсанаа гэдгийг баталгаажуулах
    const data = await r.json();
    let reply = data.choices?.[0]?.message?.content || '';
    const isFirstTurn = !Array.isArray(body.history) || body.history.length === 0;

    reply = cleanMarkdown(reply);
    reply = enforceIdentity(reply);               // << нэмэгдсэн
    reply = clipReply(reply, { maxSentences: 5, maxChars: 420 });
    reply = addIntroOnce(reply, isFirstTurn, persona);
    reply = addWarmClosing(reply, persona);

    return res.status(200).json({ reply, model: data.model, persona });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server', detail: String(e?.message || e) });
  }
}

/* === Туслах функцууд === */

// … readJson(), getUserMsg(), cleanMarkdown(), clipReply(), splitSentences(), addIntroOnce(), addWarmClosing() хэвээр …

// ✦ Буруу танилцуулбал автоматаар засах
function enforceIdentity(s = '') {
  const bad = /(би\s+оюунсанаа\s+биш|би\s+AI\s+биш|би\s+chatbot|миний\s+нэр\s+бусад)/i;
  if (bad.test(s)) {
    // Буруу хэсгийг авч, зөв танилцуулгаар эхлүүлнэ
    s = s.replace(bad, 'Би Оюунсанаа').trim();
  }
  // Эхэндээ өөрийгөө танилцуулсан эсэхийг шалгаад нэмнэ
  const startsOk = /^би\s+оюунсанаа/i.test(s);
  return startsOk ? s : `Би Оюунсанаа. ${s}`;
}
