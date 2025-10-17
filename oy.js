// oy.js — тогтвортой, нэгэн мөр хувилбар (FULL REPLACE)

(() => {
  if (window.__OY_BOOTED__) return; window.__OY_BOOTED__ = true;
  const $ = (s, r=document) => r.querySelector(s);

  const el = {
    overlay:   $('#oyOverlay'),
    drawer:    $('#oyDrawer'),
    btnDrawer: $('#btnDrawer'),
    stream:    $('#oyStream'),
    input:     $('#oyInput'),
    send:      $('#btnSend'),
    file:      $('#oyFile'),
    typing:    $('#typing'),
    panes:     document.querySelectorAll('.oy-pane'),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };

  /* ---------- ТЕМА ---------- */
  const THEMES = [
    { name:'Slate Blue',   brand:'#486573', bg1:'#0e1630', bg2:'#301a40', user:'#9BB8B9', bot:'#F1E3D5' },
    { name:'Calm Green',   brand:'#155E1A', bg1:'#0f2027', bg2:'#203a43', user:'#C2C4B9', bot:'#EEF3F4' },
    { name:'Warm Neutral', brand:'#BC9B5D', bg1:'#2b1d11', bg2:'#3d2a18', user:'#F1E3D5', bot:'#FAF7F2' },
    { name:'Soft Gray',    brand:'#666660', bg1:'#141414', bg2:'#2a2a2a', user:'#C2C4B9', bot:'#EDEDED' },
    { name:'Teal Mist',    brand:'#2E6F6C', bg1:'#0d2627', bg2:'#14383a', user:'#B6D0CD', bot:'#EAF2F1' },
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(t){
    const r = document.documentElement.style;
    r.setProperty('--brand', t.brand); r.setProperty('--bg1', t.bg1);
    r.setProperty('--bg2', t.bg2); r.setProperty('--user-bg', t.user);
    r.setProperty('--bot-bg', t.bot);
  }
  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t, i)=>{
      const b = document.createElement('button');
      b.className = 'oy-swatch'; b.title = t.name;
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.bg1}, ${t.bg2})"></i>`;
      b.addEventListener('click', ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(t); });
      el.themePicker.appendChild(b);
    });
    const idx = +localStorage.getItem(THEME_KEY) || 0; applyTheme(THEMES[idx] || THEMES[0]);
  })();

  /* ---------- Гарчиг / нас ---------- */
  const AGE_KEY = 'oy_age_choice';
  function updateTitleFromAge(){
    const saved = localStorage.getItem(AGE_KEY);
    if (el.chatTitle) el.chatTitle.textContent = saved ? ('Оюунсанаа — ' + saved) : 'Оюунсанаа — Чат';
  }
  updateTitleFromAge();

  /* ---------- Drawer ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); if (el.overlay) el.overlay.hidden = true;
  });

  /* ---------- ЧАТ суурь ---------- */
  const OY_API = window.OY_API_BASE || "";
  const MSGKEY = 'oy_msgs_one';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const scrollBottom = () => { if (el.stream) el.stream.scrollTop = el.stream.scrollHeight + 999; };

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){ const m = document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }
  function showTyping(){ if (el.typing) el.typing.hidden = false; }
  function hideTyping(){ if (el.typing) el.typing.hidden = true; }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }

  // --- pushMsg (ЗӨВХӨН НЭГ ширхэг байх ёстой) ---
  function pushMsg(who, html, isHTML = false){
    const MAX = 2000;
    let store = html;
    if (isHTML && /<img\s/i.test(html)) store = "[image]";
    else if (String(html).length > MAX) store = String(html).slice(0, MAX) + "…";

    try {
      const arr = loadMsgs();
      arr.push({ t: Date.now(), who, html: store, isHTML: false });
      localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
    } catch (e) {
      try {
        const arr = loadMsgs().slice(-20);
        localStorage.setItem(MSGKEY, JSON.stringify(arr));
      } catch {}
    }
  }

  // дэлгэц дахин зурна
  (function redraw(){
    if (!el.stream) return;
    el.stream.innerHTML=''; const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  })();

  // textarea autosize
  if (el.input){
    const auto=()=>{ el.input.style.height='auto'; el.input.style.height = Math.min(160, el.input.scrollHeight) + 'px'; };
    el.input.addEventListener('input', auto); queueMicrotask(auto);
  }

  // file -> dataURL (preview + илгээхэд)
  function fileToDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // === төлөв ===
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';

  // API дуудах — зурагтай/урт ярианд 4o, бусад үед 4o-mini
async function callChat({ text = "", images = [] }){
  showTyping();
  try {
    const USER_LANG = (window.OY_LANG || document.documentElement.lang || navigator.language || 'mn').split('-')[0] || 'mn';
    const forceModel = (images.length || HISTORY.length >= 12) ? 'gpt-4o' : 'gpt-4o-mini';

    const r = await fetch(`${window.OY_API_BASE.replace(/\/+$/, '')}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: (typeof CURRENT_MODULE !== 'undefined' ? CURRENT_MODULE : 'psychology'),
        text, images,
        chatHistory: HISTORY,
        userLang: USER_LANG,
        forceModel               // <-- эндээс сервер лүү дамжина
      })
    });

    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const reply = j?.output?.[0]?.content?.[0]?.text || j?.reply || "…";
    bubble(reply, 'bot'); pushMsg('bot', reply);
    HISTORY.push({ role:'assistant', content: reply });
  } catch (e) {
    console.error(e);
    bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
  } finally { hideTyping(); }
}
// --- Илгээх явцын төлөв (давхар дуудагдахаас сэргийлнэ) ---
let BUSY = false;

// --- Илгээх үндсэн функц ---
async function sendCurrent(){
  if (BUSY) return;

  const t = (el.input?.value || "").trim();

  // Зургуудыг зөвхөн энд (илгээх мөчид) dataURL болгоно
  const fileList = Array.from(el.file?.files || []);
  const dataURLs = [];
  for (const f of fileList) {
    if (f.type.startsWith('image/')) {
      dataURLs.push(await fileToDataURL(f));
    }
  }

  // Текст ч үгүй, зураг ч үгүй бол юу ч хийхгүй
  if (!t && dataURLs.length === 0) return;

  // Хэрэглэгчийн текстийг одоо л хадгална (preview дээр хадгалж байгааг болиулсан)
  if (t) { 
    bubble(t, 'user'); 
    pushMsg('user', t); 
    HISTORY.push({ role:'user', content:t }); 
  }

  // Илгээхээс өмнө input-уудыг reset
  if (el.input){ el.input.value = ""; el.input.dispatchEvent(new Event('input')); }
  if (el.file){ el.file.value = ""; }

  BUSY = true;
  try {
    await callChat({ text: t, images: dataURLs });
  } finally {
    BUSY = false;
  }
}

// --- Товч/Enter триггер ---
el.send?.addEventListener('click', sendCurrent);
el.input?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey) { 
    e.preventDefault(); 
    sendCurrent(); 
  }
});

// --- Зураг сонгох: зөвхөн PREVIEW (хадгалж/илгээхгүй) ---
el.file?.addEventListener('change', async (e)=>{ 
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const d = await fileToDataURL(f);
      bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`, 'user', true);
      // ⛔ preview үед pushMsg хийдгүй, илгээхдээ л хадгална
    } else {
      bubble('📎 ' + f.name, 'user'); // дүрс биш бол нэрийг л харуулна
    }
  }

  // Зураг сонгосны дараа текст бичихэд бэлэн болгох
  el.input?.focus();
});

  // Зүүн меню → oySend
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text, 'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content: text });

    const files = Array.from(el.file?.files || []), images = [];
    for (const f of files) if (f.type.startsWith('image/')) images.push(await fileToDataURL(f));
    if (el.file) el.file.value="";
    await callChat({ text, images });
  };

  // Sidebar дотоод pane нээх
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const target = Array.from(document.querySelectorAll('.oy-pane')).find(p=>p.dataset.pane===key);
      if (!target) return;
      if (!target.hidden) { target.hidden = true; return; }
      document.querySelectorAll('.oy-pane').forEach(p=>p.hidden = p!==target);
    });
  });

})();
