/* ---------- State + API ---------- */
let HISTORY = [];
let CURRENT_MODULE = 'psychology';

// API үндэс URL-ээ head доторх <script> мөрөөс авч, / давхардлыг цэвэрлэнэ
const OY_API = (window.OY_API_BASE || '').replace(/\/+$/,'');
const CHAT_URL = OY_API ? (OY_API + '/v1/chat') : '';

// жижиг туслагчид
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };
function bubble(html, who='bot', isHTML=false){
  const d = document.createElement('div');
  d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
  d.innerHTML = isHTML ? html : esc(html);
  el.stream.appendChild(d);
  scrollBottom();
  return d;
}
function meta(t){ const m = document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }
function showTyping(){ if (el.typing) el.typing.style.display = 'flex'; }
function hideTyping(){ if (el.typing) el.typing.style.display = 'none'; }

// API-гаас ирэх янз бүрийн форматаас текстээ олоод авах НЭГ л функц
function pickReply(j){
  return (
    j?.output?.[0]?.content?.find?.(c => c.type === 'text' || c.type === 'output_text')?.text ||
    j?.output?.[0]?.content?.[0]?.text ||
    j?.reply ||
    j?.message ||
    ""
  );
}

// === API CALL ===
async function callChat({ text = "", images = [] }){
  if (!CHAT_URL){
    bubble("⚠️ API тохируулга хийгдээгүй (window.OY_API_BASE).", "bot");
    return;
  }

  showTyping();
  try{
    const USER_LANG = (window.OY_LANG || navigator.language || 'mn').split('-')[0];

    const r = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: CURRENT_MODULE,
        text,
        images,
        chatHistory: HISTORY,
        userLang: USER_LANG
      })
    });

    if (!r.ok){
      // сервер 200 биш үед текстэн алдааг харуулна
      const errText = await r.text().catch(()=>String(r.status));
      throw new Error(errText || `HTTP ${r.status}`);
    }

    const data  = await r.json();
    const reply = (pickReply(data) || "").trim();

    if (!reply){
      bubble("… (хоосон хариу ирлээ)", "bot");
    }else{
      bubble(reply, "bot");
      HISTORY.push({ role:'assistant', content: reply });
    }

    if (data?.model) meta(`Model: ${data.model}`);
  }catch(e){
    console.error(e);
    bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", "bot");
  }finally{
    hideTyping();
  }
}

// === Илгээх ===
let previewImages = []; // хэрвээ зураг ашиглавал
async function sendCurrent(){
  const t = (el.input?.value || "").trim();
  if (!t && !previewImages.length) return;

  if (t){
    bubble(t, 'user');
    HISTORY.push({ role:'user', content: t });
  }
  const imgs = [...previewImages];
  el.input.value = "";
  previewImages = [];

  await callChat({ text: t, images: imgs });
}

// илгээх товч / Enter
el.send?.addEventListener('click', sendCurrent);
el.input?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendCurrent();
  }
});
