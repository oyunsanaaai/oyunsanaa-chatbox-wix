(()=> {
  if (window.__OY_BOOTED__) return;  // дахин ачаалтад давхар бүү ажилла
  window.__OY_BOOTED__ = true;

  const $ = (s, r=document) => r.querySelector(s);

  const el = {
    overlay:   $('#oyOverlay'),
    drawer:    $('#oyDrawer'),
    btnDrawer: $('#btnDrawer'),
    stream:    $('#oyStream'),
    input:     $('#oyInput'),
    send:      $('#btnSend'),
    file:      $('#oyFile'),
    previews:  $('#oyPreviews'),
    typing:    $('#typing'),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };
// --- API base + endpoint
const API_BASE = window.OY_API_BASE || "";
const CHAT_URL = `${API_BASE}/v1/chat`;

  /* ---------- Themes ---------- */
  const THEMES = [
    {name:'Blue',  grad:['#0d1726','#1d2740']},
    {name:'Green', grad:['#081a16','#12322b']},
    {name:'Gold',  grad:['#1b140b','#332515']},
    {name:'Gray',  grad:['#0f1114','#191b22']},
    {name:'Teal',  grad:['#0a2021','#143638']},
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }

  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'oy-swatch';
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})"></i>`;
      b.title = t.name;
      b.addEventListener('click', ()=>{
        localStorage.setItem(THEME_KEY, String(i));
        applyTheme(i);
      });
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  /* ---------- Drawer (single bind) ---------- */
  function bindOnce(target, evt, fn) {
    if (!target) return;
    target.__oybind = target.__oybind || {};
    const old = target.__oybind[evt];
    if (old) target.removeEventListener(evt, old);
    target.addEventListener(evt, fn);
    target.__oybind[evt] = fn;
  }

  bindOnce(el.btnDrawer, 'click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = !opened;
  });

  bindOnce(el.overlay, 'click', ()=>{
    document.body.classList.remove('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = true;
  });

  /* ---------- Helpers ---------- */
  const OY_API = window.OY_API_BASE || "";
  const MSGKEY = 'oy_msgs_one';

  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){
    const m = document.createElement('div');
    m.className='oy-meta'; m.textContent=t;
    el.stream.appendChild(m); scrollBottom();
  }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html, isHTML=false){
    // localStorage-д том DataURL хадгалахгүй
    const MAX = 2000; let store = html;
    if (isHTML && /<img\s/i.test(html)) store = "[image]";
    else if (String(html).length > MAX) store = String(html).slice(0, MAX) + "…";
    try{
      const arr = loadMsgs(); arr.push({ t: Date.now(), who, html: store, isHTML:false });
      localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
    }catch(e){
      try{
        const arr = loadMsgs().slice(-20);
        localStorage.setItem(MSGKEY, JSON.stringify(arr));
      }catch(_){}
    }
  }

  (function redraw(){
    if (!el.stream) return;
    el.stream.innerHTML=''; const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  })();

  function showTyping(){
    if (!el.typing) return;
    el.typing.style.display = 'flex';
    clearTimeout(window.__oyTypingTimer);
    window.__oyTypingTimer = setTimeout(()=>{ el.typing.style.display='none'; }, 1600);
  }
  function hideTyping(){ if (el.typing) el.typing.style.display='none'; }

  // file -> dataURL
  function fileToDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // preview chips (NEVER auto-send)
  let previewImages = []; // dataURL array
  function renderPreviews(){
    if (!el.previews) return;
    if (!previewImages.length){ el.previews.hidden = true; el.previews.innerHTML=''; return; }
    el.previews.hidden = false;
    el.previews.innerHTML = previewImages.map((d,i)=>(
      `<div class="oy-chip"><img src="${d}" alt=""><button data-i="${i}">×</button></div>`
    )).join('');
    el.previews.querySelectorAll('button').forEach(btn=>{
      btn.onclick = () => { const i = +btn.dataset.i; previewImages.splice(i,1); renderPreviews(); };
    });
  }

  /* ---------- State ---------- */
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';

  async function callChat({ text="", images=[] }){
    if (!OY_API){ bubble("⚠️ API тохируулга хийгдээгүй (OY_API_BASE).", 'bot'); return; }
    showTyping();
    try{
      const USER_LANG = (window.OY_LANG || navigator.language || 'mn').split('-')[0] || 'mn';
      const r = await fetch(`${OY_API}/v1/chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ moduleId: CURRENT_MODULE, text, images, chatHistory: HISTORY, userLang: USER_LANG })
      });
      const j = await r.json();
     let reply = "…";
if (j) {
  // 1) шинэ формат (GPT structured)
  const maybe = j.output?.[0]?.content?.find?.(c=>c.type==='output_text')?.text;
  // 2) хуучин формат (reply key)
  const fallback = j.reply || j.message || j.answer || j.output_text;
  reply = maybe || fallback || "⚠️ Хоосон хариу ирлээ.";
}
bubble(reply, 'bot');
pushMsg('bot', reply);
HISTORY.push({ role:'assistant', content: reply });
      bubble(reply,'bot'); pushMsg('bot', reply);
      HISTORY.push({ role:'assistant', content: reply });
      if (j?.model) meta(`Model: ${j.model}`);
    }catch(e){
      bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
    }finally{ hideTyping(); }
  }

 // ---- API CALL (robust reply extractor) ----
function pickReply(j){
  // серверээс ямар формат ирснээс үл хамаараад текстийг нь олж авна
  return (
    j?.reply ??
    j?.message ??
    j?.choices?.[0]?.message?.content ??
    j?.output?.[0]?.content?.find?.(c => c.type === 'output_text' || c.type === 'text')?.text ??
    j?.content ?? ""
  );
}

async function callChat({ text = "", images = [] }){
  if (!API_BASE){
    bubble("⚠️ API тохируулга хийгдээгүй байна. (window.OY_API_BASE)", "bot");
    return;
  }

  showTyping();
  try{
    const USER_LANG =
      (window.OY_LANG || document.documentElement.lang || navigator.language || "mn")
        .split("-")[0];

    // олон зураг эсвэл урт түүхтэй бол том модель руу шилжих (хэрэгтэй бол)
    const forceModel = images.length || (HISTORY.length >= 12) ? "gpt-4o" : "gpt-4o-mini";

    const r = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: CURRENT_MODULE,
        text,
        images,                 // dataURL массив (чиний кодтой таарч байна)
        chatHistory: HISTORY,
        userLang: USER_LANG,
        forceModel
      }),
    });

    if (!r.ok){
      // сервер 200 биш бол текстийг нь харуулж алдаа гэж үзнэ
      throw new Error(await r.text());
    }

    const data  = await r.json();
    const reply = pickReply(data).trim();

    if (!reply){
      bubble("… (хоосон хариу ирлээ)", "bot");
    }else{
      bubble(reply, "bot");
      pushMsg("bot", reply);
      HISTORY.push({ role: "assistant", content: reply });
    }

    if (data?.model) meta(`Model: ${data.model}`);

  }catch(e){
    console.error(e);
    bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", "bot");
  }finally{
    hideTyping();
  }
}

  /* ---------- Menu open/close ---------- */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const target = Array.from(document.querySelectorAll('.oy-pane')).find(p=>p.dataset.pane===key);
      if (!target) return;
      if (!target.hidden) { target.hidden = true; return; }
      document.querySelectorAll('.oy-pane').forEach(p=>p.hidden = p!==target);
    });
  });

  /* ---------- Public API for menu buttons ---------- */
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text,'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content: text });
    const imgs = [...previewImages]; previewImages = []; renderPreviews();
    await callChat({ text, images: imgs });
  };

})();
