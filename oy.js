// oy.js — нэгтгэсэн хувилбар
(()=> {
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
    menuMount: $('#oyMenuDyn')
  };

  /* --------- ТЕМА ---------- */
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
    r.setProperty('--brand', t.brand);
    r.setProperty('--bg1', t.bg1);
    r.setProperty('--bg2', t.bg2);
    r.setProperty('--user-bg', t.user);
    r.setProperty('--bot-bg', t.bot);
  }
  function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t, i)=>{
      const b = document.createElement('button');
      b.className = 'oy-swatch';
      b.title = t.name;
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.bg1}, ${t.bg2})"></i>`;
      b.addEventListener('click', ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(t); });
      el.themePicker.appendChild(b);
    });
    const idx = +localStorage.getItem(THEME_KEY) || 0; applyTheme(THEMES[idx] || THEMES[0]);
  }

  /* --------- Нас / гарчиг ---------- */
  const AGE_KEY = 'oy_age_choice';
  function updateTitleFromAge(){
    const saved = localStorage.getItem(AGE_KEY);
    el.chatTitle.textContent = saved ? ('Оюунсанаа — ' + saved) : 'Оюунсанаа — Чат';
  }
  $('#btnRegister')?.addEventListener('click', (e)=>{
    e.preventDefault();
    const form = $('#ageForm'); if(!form) return;
    const sel = form.querySelector('input[name="age"]:checked');
    if(!sel) { alert('Эхлээд насны ангилал сонгоно уу.'); return; }
    const label = sel.parentElement.textContent.trim();
    localStorage.setItem(AGE_KEY, label);
    updateTitleFromAge();
    alert('Сонголт хадгалагдлаа.');
  });
  updateTitleFromAge();

  /* --------- Drawer ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if(el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); if(el.overlay) el.overlay.hidden = true;
  });

  /* --------- ЧАТ суурь ---------- */
  const OY_API_BASE = window.OY_API_BASE || ""; // "https://chat.oyunsanaa.com"
  const MSGKEY = 'oy_msgs_one';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){ const m = document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html, isHTML=false){
    const arr = loadMsgs(); arr.push({t:Date.now(), who, html, isHTML});
    localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
  }
  function redraw(){
    el.stream.innerHTML='';
    const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ганц чат. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  }

  function showTyping(){ if (el.typing) el.typing.hidden = false; }
  function hideTyping(){ if (el.typing) el.typing.hidden = true; }

  // ——— data URL болгож Vision руу явуулах
  async function fileToDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ——— API: /api/chat
  let HISTORY = []; // сервер рүү явуулах history (хүсвэл localStorage-оос сэргээж болно)
  async function callChat({ text="", images=[] }){
    showTyping();
    try {
      const r = await fetch(`${OY_API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: CURRENT_MODULE,
          text,
          images,           // data:... URL жагсаалт
          chatHistory: HISTORY
        })
      });
      const j = await r.json();
      const reply = j?.reply || "⚠️ Хариу авсангүй.";
      bubble(reply, 'bot'); pushMsg('bot', reply);
      HISTORY.push({ role:'assistant', content: reply });
      meta(j?.model ? `Model: ${j.model}` : '');
    } catch (e) {
      bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
    } finally { hideTyping(); }
  }

  // ——— Илгээх (send товч, Enter)
  async function sendCurrent(){
    const t = (el.input.value || "").trim();
    const files = Array.from(el.file?.files || []);
    if (!t && !files.length) return;

    // UI тал
    if (t) { bubble(t, 'user'); pushMsg('user', t); HISTORY.push({ role:'user', content: t }); }
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
    el.input.value = ""; if (el.file) el.file.value = "";

    await callChat({ text: t, images: dataURLs });
  }

  el.send?.addEventListener('click', sendCurrent);
  el.input?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCurrent(); }
  });

  // Файл сонгосон даруйд preview гаргах (илгээх үед бодит илгээнэ)
  el.file?.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files||[]);
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        bubble('📎 '+f.name, 'user'); pushMsg('user', f.name);
      } else {
        const d = await fileToDataURL(f);
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
        pushMsg('user', `<img src="${d}">`, true);
      }
    }
  });

  /* --------- Меню (JSON → sidebar) ---------- */
// API суурь домэйн
const OY_API_BASE = window.OY_API_BASE || "https://chat.oyunsanaa.com";

// ——— Sidebar динамик меню
const mount = document.querySelector('#oyMenuDyn');  // index.html дотор байгаа хоосон div
let CURRENT_MODULE = "psychology";
let HISTORY = [];

async function getMenu(){
  const r = await fetch(`${OY_API_BASE}/api/menu`);
  const j = await r.json();              // <— Одооноос 404 биш JSON буцна
  return j.menu || [];
}

function renderSixMenus(menu){
  if (!mount) return;
  mount.innerHTML = "";
  menu.forEach(cat => {
    const sec = document.createElement('section');
    sec.className = 'oy-pane';   // яг “Сэтгэлийн боловсрол” шиг хүрээтэй
    sec.innerHTML = `
      <h4 style="margin:6px 0">${cat.label}</h4>
      <ul class="oy-list">
        ${cat.items.map(it => `
          <li>
            <span>${it.label}</span>
            <button class="oy-mini" data-mid="${cat.id}" data-bid="${it.id}">Орох</button>
          </li>
        `).join('')}
      </ul>
    `;
    mount.appendChild(sec);
  });

  mount.querySelectorAll('button[data-mid]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const mid = btn.getAttribute('data-mid');
      const bid = btn.getAttribute('data-bid');
      CURRENT_MODULE = mid;
      // UI-д мессеж нэмээд API-гаа дуудна
      bubble(`${mid} → ${bid}`, 'user'); pushMsg('user', `${mid} → ${bid}`);
      HISTORY.push({ role:'user', content:`User selected: ${mid}/${bid}` });
      callChat({ text:`User selected: ${mid}/${bid}`, images:[] });
    });
  });
}

async function callChat({ text="", images=[] }){
  showTyping();
  try{
    const r = await fetch(`${OY_API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: CURRENT_MODULE, text, images, chatHistory: HISTORY }),
    });
    const j = await r.json();
    bubble(j.reply || "…", 'bot'); pushMsg('bot', j.reply || "…");
    HISTORY.push({ role:'assistant', content: j.reply || "" });
    meta(j.model ? `Model: ${j.model}` : "");
  } catch(e){
    bubble("⚠️ API холболт амжилтгүй.", 'bot');
  } finally { hideTyping(); }
}

// Ачаалмагц меню татаж зурна
getMenu().then(renderSixMenus).catch(()=>bubble("⚠️ Меню ачаалсангүй.", "bot"));
