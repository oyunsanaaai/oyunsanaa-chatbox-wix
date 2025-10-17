(()=> {
  // ---- DOM ----
  const $ = s => document.querySelector(s);
  const stream = $('#oyStream') || document.body.appendChild(Object.assign(document.createElement('div'),{id:'oyStream',style:'padding:16px;color:#eaf6ff'}));
  const input  = $('#oyInput')  || document.body.appendChild(Object.assign(document.createElement('textarea'),{id:'oyInput',style:'width:90%;height:60px;margin:8px 16px;'}));
  const send   = $('#btnSend')  || document.body.appendChild(Object.assign(document.createElement('button'),{id:'btnSend',textContent:'Send',style:'margin:0 16px 16px'}));

  // ---- URL ----
  const BASE = window.OY_API_BASE || "";
  const CHAT_URL = BASE ? `${BASE}/v1/chat` : "";

  // ---- туслахууд ----
  const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const bubble = (txt, who='bot') => {
    const d = document.createElement('div');
    d.style = `max-width:680px;margin:8px 16px;padding:10px 12px;border-radius:12px;border:1px solid #2b3445;background:${who==='user'?'#ffffff10':'#00000020'}`;
    d.innerHTML = esc(txt);
    stream.appendChild(d);
    stream.scrollTop = stream.scrollHeight + 999;
  };

  const pickReply = (j) =>
      j?.output?.[0]?.content?.find?.(c => c.type==='text')?.text ||
      j?.output?.[0]?.content?.[0]?.text ||
      j?.choices?.[0]?.message?.content ||
      j?.reply || j?.message || "";

  // ---- илгээх ----
  async function callChat(text){
    if (!CHAT_URL){ bubble("⚠️ OY_API_BASE тогтоогоогүй байна.", 'bot'); return; }
    try{
      const r = await fetch(CHAT_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          moduleId: "psychology",
          text,
          images: [],
          chatHistory: [],
          userLang: (navigator.language||'mn').split('-')[0]
        })
      });

      // 200 биш бол алдааг яг текстээр нь үзүүл
      if (!r.ok){
        const errTxt = await r.text();
        bubble(`⚠️ Сервер алдаа (${r.status}).\n${errTxt}`, 'bot');
        return;
      }

      const data = await r.json();
      const reply = (pickReply(data) || "").trim();

      if (!reply) bubble("… (хоосон хариу ирлээ)", 'bot');
      else bubble(reply, 'bot');

    }catch(e){
      bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
      console.error(e);
    }
  }

  function sendNow(){
    const t = (input.value || "").trim();
    if (!t) return;
    bubble(t, 'user');
    input.value = "";
    callChat(t);
  }

  send.addEventListener('click', sendNow);
  input.addEventListener('keydown', e=>{
    if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendNow(); }
  });

  // эхний мэндчилгээг үзүүлэх
  bubble("Сайн уу! Туршилтын горим. Текст бичээд Enter дарна уу 😊",'bot');
})();
