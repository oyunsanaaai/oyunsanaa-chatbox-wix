/* ---------- ЧАТ суурь ---------- */
const OY_API = window.OY_API_BASE || "";   // ж: "" = same origin
const MSGKEY = 'oy_msgs_one';
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };

function bubble(html, who='bot', isHTML=false){
  const d = document.createElement('div');
  d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
  d.innerHTML = isHTML ? html : esc(html);
  el.stream.appendChild(d); scrollBottom(); return d;
}
function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
function pushMsg(who, html, isHTML=false){
  const arr = loadMsgs(); arr.push({t:Date.now(), who, html, isHTML});
  localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
}
(function redraw(){
  if (!el.stream) return;
  el.stream.innerHTML=''; const arr = loadMsgs();
  if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ганц чат. 🌿','bot'); }
  else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
})();

function showTyping(){ el.typing && (el.typing.hidden = false); }
function hideTyping(){ el.typing && (el.typing.hidden = true); }

// файл -> dataURL (зургаа явуулахад)
function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Түүх (клиент тал)
let HISTORY = [];
let CURRENT_MODULE = 'psychology';

// --- API руу POST хийх ганц функц ---
async function callChat({ text = "", images = [] }) {
  showTyping();
  try {
    const USER_LANG = (window.OY_LANG || navigator.language || 'mn').split('-')[0];
    const r = await fetch(`${OY_API}/api/chat`, {
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
    const j = await r.json();
    const reply = j?.reply || j?.message || "…";
    bubble(reply, 'bot');            // дэлгэцэнд харуулах
    pushMsg('bot', reply);           // localStorage-д хадгалах
    HISTORY.push({ role: 'assistant', content: reply });
  } catch (e) {
    console.error(e);
    bubble("⚠️ API-д холбогдож чадсангүй. Дараад дахин оролдоно уу.", "bot");
  } finally {
    hideTyping();
  }
}

// --- Илгээх логик ---
async function sendCurrent(){
  const t = (el.input?.value || "").trim();
  const files = Array.from(el.file?.files || []);
  if (!t && files.length === 0) return;

  // хэрэглэгчийн мессежийг нэг л удаа харуулна
  if (t) {
    bubble(t, 'user'); pushMsg('user', t);
    HISTORY.push({ role:'user', content: t });
  }

  // зураг бэлтгэх (dataURL)
  const dataURLs = [];
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const d = await fileToDataURL(f);
      bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
      pushMsg('user', `<img src="${d}">`, true);
      dataURLs.push(d);
    } else {
      bubble('📎 ' + f.name, 'user'); pushMsg('user', f.name);
    }
  }

  if (el.input) el.input.value = "";
  if (el.file)  el.file.value  = "";

  await callChat({ text: t, images: dataURLs });
}

/* ---- SEND товчны event listeners ---- */
el.send?.addEventListener('click', sendCurrent);
el.input?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCurrent(); }
});
// (optional) файл сонгоход зөвхөн preview хийж харуулах бол энд бичиж болно
el.file?.addEventListener('change', () => {});
