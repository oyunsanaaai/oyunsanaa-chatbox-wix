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
    previews:  $('#oyPreviews'),
    typing:    $('#typing'),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };

  /* ---------- Themes ---------- */
  const THEMES = [
    {name:'Blue',   grad:['#0d1726','#1d2740']},
    {name:'Green',  grad:['#081a16','#12322b']},
    {name:'Gold',   grad:['#1b140b','#332515']},
    {name:'Gray',   grad:['#0f1114','#191b22']},
    {name:'Teal',   grad:['#0a2021','#143638']},
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }
  (function renderThemePicker(){
    el.themePicker.innerHTML = ''; THEMES.forEach((t,i)=>{
      const b = document.createElement('button'); b.className='oy-swatch';
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})"></i>`;
      b.title = t.name; b.addEventListener('click', ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(i); });
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  /* ---------- Drawer ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); if (el.overlay) el.overlay.hidden = true;
  });
/* ---------- Drawer ---------- */
el.btnDrawer?.addEventListener('click', ()=>{
  const opened = document.body.classList.toggle('oy-drawer-open');
  if (el.overlay) el.overlay.hidden = !opened;
});
el.overlay?.addEventListener('click', ()=>{
  document.body.classList.remove('oy-drawer-open');
  if (el.overlay) el.overlay.hidden = true;
});

/* -------- Chat send + typing END -------- */
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
  function meta(t){ const m = document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html, isHTML=false){
    // localStorage-д том зураг хадгалахгүй
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

  function showTyping(){ if (el.typing) el.typing.hidden = false; }
  function hideTyping(){ if (el.typing) el.typing.hidden = true; }

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
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          moduleId: CURRENT_MODULE, text, images,
          chatHistory: HISTORY, userLang: USER_LANG
        })
      });
      const j = await r.json();
      const reply = j?.output?.[0]?.content?.find?.(c=>c.type==='output_text')?.text || j?.reply || "…";
      bubble(reply,'bot'); pushMsg('bot', reply);
      HISTORY.push({ role:'assistant', content: reply });
      if (j?.model) meta(`Model: ${j.model}`);
    }catch(e){
      bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", 'bot');
    }finally{ hideTyping(); }
  }

  // send
  async function sendCurrent(){
    const t = (el.input?.value || "").trim();
    if (!t && !previewImages.length) return;

    if (t) { bubble(t,'user'); pushMsg('user', t); HISTORY.push({ role:'user', content: t }); }
    const imgs = [...previewImages];
    if (imgs.length){
      // чат дээр харагдуулах
      imgs.forEach(d=>{
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
        pushMsg('user', `<img src="${d}">`, true);
      });
    }
    el.input.value = ""; previewImages = []; renderPreviews();
    await callChat({ text: t, images: imgs });
  }

  el.send?.addEventListener('click', sendCurrent);
  el.input?.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && !e.shiftKey){
      e.preventDefault(); sendCurrent();
    }
  });

  // file choose => PREVIEW only
  el.file?.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const f of files){
      if (f.type.startsWith('image/')){
        previewImages.push(await fileToDataURL(f));
      }
    }
    e.target.value = "";
    renderPreviews();
    el.input?.focus();
  });

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
