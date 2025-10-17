// oy.js — Оюунсанаа ЧАТ / энгийн, тогтвортой хувилбар
(() => {
  if (window.__OY_BOOTED__) return; window.__OY_BOOTED__ = true;
  const $ = (s, r=document) => r.querySelector(s);

  /* === DOM === */
  const el = {
    overlay:   $('#oyOverlay'),
    drawer:    $('#oyDrawer'),
    btnDrawer: $('#btnDrawer'),
    stream:    $('#oyStream'),
    input:     $('#oyInput'),
    send:      $('#btnSend'),
    file:      $('#oyFile'),
    typing:    $('#typing'),
    panes:     Array.from(document.querySelectorAll('.oy-pane')),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };

  /* === API === */
  const API_BASE = String(window.OY_API_BASE || '').replace(/\/+$/,''); // ардын "/"-г авч хаяна
  const CHAT_URL = `${API_BASE}/v1/chat`;

  /* === Тема (өнгө) — товч байлгалаа === */
  const THEMES = [
    { name:'Slate', brand:'#486573', bg1:'#0e1630', bg2:'#301a40', user:'#9BB8B9', bot:'#F1E3D5' },
    { name:'Teal',  brand:'#2E6F6C', bg1:'#0d2627', bg2:'#14383a', user:'#B6D0CD', bot:'#EAF2F1' },
  ];
  const THEME_KEY='oy_theme_idx_v1';
  function applyTheme(t){
    const r=document.documentElement.style;
    r.setProperty('--brand', t.brand);
    r.setProperty('--bg1', t.bg1);
    r.setProperty('--bg2', t.bg2);
    r.setProperty('--user-bg', t.user);
    r.setProperty('--bot-bg', t.bot);
  }
  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML='';
    THEMES.forEach((t,i)=>{
      const b=document.createElement('button');
      b.className='oy-swatch';
      b.title=t.name;
      b.innerHTML=`<i style="background:linear-gradient(135deg, ${t.bg1}, ${t.bg2})"></i>`;
      b.addEventListener('click',()=>{ localStorage.setItem(THEME_KEY,String(i)); applyTheme(t); });
      el.themePicker.appendChild(b);
    });
    const idx=+localStorage.getItem(THEME_KEY)||0; applyTheme(THEMES[idx]||THEMES[0]);
  })();

  /* === Нас/гарчиг === */
  const AGE_KEY='oy_age_choice';
  function updateTitleFromAge(){
    const saved=localStorage.getItem(AGE_KEY);
    if (el.chatTitle) el.chatTitle.textContent = saved ? ('Оюунсанаа — ' + saved) : 'Оюунсанаа — Чат';
  }
  updateTitleFromAge();

  /* === Drawer === */
  function openDrawer(open=true){
    document.body.classList.toggle('oy-drawer-open', !!open);
    if (el.overlay) el.overlay.hidden = !open;
  }
  el.btnDrawer?.addEventListener('click', ()=> openDrawer(!document.body.classList.contains('oy-drawer-open')));
  el.overlay?.addEventListener('click', ()=> openDrawer(false));

  /* === Sidebar: товч → pane === */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key=btn.dataset.menu;
      const target=el.panes.find(p=>p.dataset.pane===key);
      if(!target) return;
      if (!target.hidden) { target.hidden = true; return; }
      el.panes.forEach(p=>p.hidden = p!==target);
    });
  });

  /* === Chat helpers === */
  const MSGKEY='oy_msgs_one';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const scrollBottom=()=>{ if(el.stream) el.stream.scrollTop = el.stream.scrollHeight + 999; };
  function bubble(html, who='bot', isHTML=false){
    const d=document.createElement('div');
    d.className='oy-bubble ' + (who==='user'?'oy-user':'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){ const m=document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }
  function showTyping(){ el.typing && (el.typing.hidden=false); }
  function hideTyping(){ el.typing && (el.typing.hidden=true); }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html, isHTML=false){
    const arr=loadMsgs(); arr.push({t:Date.now(), who, html, isHTML});
    localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
  }
  (function redraw(){
    if(!el.stream) return;
    el.stream.innerHTML='';
    const arr=loadMsgs();
    if(!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else arr.forEach(m=>bubble(m.html, m.who, m.isHTML));
  })();

  // textarea autosize
  if (el.input){
    const auto=()=>{ el.input.style.height='auto'; el.input.style.height=Math.min(el.input.scrollHeight, 180)+'px'; };
    el.input.addEventListener('input', auto); queueMicrotask(auto);
  }

  // file -> dataURL
  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(file);
    });
  }

  /* === State === */
  let HISTORY=[];
  let CURRENT_MODULE='psychology';

  /* === API Call === */
  async function callChat({ text="", images=[] }){
    if (!API_BASE){ bubble("⚠️ API тохируулаагүй байна.", 'bot'); return; }
    showTyping();
    try{
      const USER_LANG=(window.OY_LANG || document.documentElement.lang || navigator.language || 'mn').split('-')[0];
      const forceModel = images.length || HISTORY.length>=12 ? 'gpt-4o' : 'gpt-4o-mini';

      const r = await fetch(CHAT_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          moduleId: CURRENT_MODULE,
          text, images,
          chatHistory: HISTORY,
          userLang: USER_LANG,
          forceModel
        })
      });
      if(!r.ok) throw new Error(await r.text());
      const data = await r.json();

      const reply = data?.output?.[0]?.content?.[0]?.text ?? data?.reply ?? '…';
      bubble(reply, 'bot'); pushMsg('bot', reply);
      HISTORY.push({ role:'assistant', content: reply });
      if (data?.model) meta(`Model: ${data.model}`);
    }catch(e){
      console.error(e);
      bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
    }finally{ hideTyping(); }
  }

  /* === Илгээх === */
  async function sendCurrent(){
    const t=(el.input?.value||"").trim();
    const files=Array.from(el.file?.files||[]);
    if(!t && !files.length) return;

    // user bubble
    if (t){ bubble(t,'user'); pushMsg('user', t); HISTORY.push({ role:'user', content:t }); }

    // build images (preview + payload)
    const dataURLs=[];
    for (const f of files){
      if (f.type?.startsWith('image/')){
        const d = await fileToDataURL(f);
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`, 'user', true);
        pushMsg('user', `<img src="${d}">`, true);
        dataURLs.push(d);
      } else {
        bubble('📎 '+f.name, 'user'); pushMsg('user', f.name);
      }
    }

    // reset inputs BEFORE calling API so дараагийн мессеж зураг дагахгүй
    if (el.input){ el.input.value=""; el.input.dispatchEvent(new Event('input')); }
    if (el.file) el.file.value = "";

    await callChat({ text:t, images:dataURLs });
  }

  el.send?.addEventListener('click', sendCurrent);
  el.input?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendCurrent(); }});
  el.file?.addEventListener('change', async e=>{
    // зөвхөн preview — API-р илгээх нь sendCurrent дээр болно
    const files=Array.from(e.target.files||[]);
    for (const f of files) if (f.type?.startsWith('image/')){
      const d=await fileToDataURL(f);
      bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`, 'user', true);
      pushMsg('user', `<img src="${d}">`, true);
    }
  });

  /* === Зүүн меню → oySend(module, action) === */
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text,'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content:text });

    // Хэрэв тухайн үед зураг сонгосон байвал хамт илгээ
    const files=Array.from(el.file?.files||[]);
    const images=[];
    for (const f of files) if (f.type?.startsWith('image/')) images.push(await fileToDataURL(f));
    if (el.file) el.file.value = "";

    await callChat({ text, images });
  };

})(); // ← ЭНЭ МӨР заавал байх ёстой!
