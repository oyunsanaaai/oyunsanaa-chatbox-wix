(()=>{

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

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
    {name:'Blue',   grad:['#1a2c57','#0e1524']},
    {name:'Green',  grad:['#0a2f26','#061b15']},
    {name:'Gold',   grad:['#2a2011','#1b140b']},
    {name:'Gray',   grad:['#1b2028','#0f1114']},
    {name:'Teal',   grad:['#103c42','#082026']},
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
    el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); el.overlay.hidden = true;
  });

  /* ---------- Menu (JSON-оос) ---------- */
  const TOP_LINKS = [
    {label:'Бүртгэл', url:'https://YOUR-WIX-SITE.com/register'},
    {label:'Миний хөтөлбөр', url:'https://YOUR-WIX-SITE.com/my-program'},
    {label:'Сэтгэлийн хөтөч', url:'https://YOUR-WIX-SITE.com/guides'},
  ];
  const GROUPS = [
    { name:'Сэтгэлзүй', key:'psychology' },
    { name:'Эрүүл мэнд', key:'health' },
    { name:'Санхүү', key:'finance' },
    { name:'Зорилго', key:'goals' },
    { name:'Харилцаа', key:'relationship' },
    { name:'Орчин', key:'environment' },
    { name:'Сануулга', key:'reminder' },
    { name:'Тэмдэглэл', key:'journal' },
  ];
  const GROUP_ACTIONS = ['Танилцуулга','Сургалт','Дасгал','Шалгалт','Тайлан'];

  (function renderMenu(){
    const links = $('#topLinks');
    links.innerHTML = TOP_LINKS.map(l=>`<a class="oy-item" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('');

    const host = $('#menuGroups'); host.innerHTML = '';
    GROUPS.forEach(g=>{
      const wrap = document.createElement('div'); wrap.className='oy-group';
      wrap.innerHTML = `
        <button class="oy-item" data-menu="${g.key}">${g.name}</button>
        <section class="oy-pane" data-pane="${g.key}" hidden>
          <ul class="oy-list">
            ${GROUP_ACTIONS.map(a=>(
              `<li><span>${a}</span><button class="oy-mini" data-act="${a}" data-mod="${g.key}">Орох</button></li>`
            )).join('')}
          </ul>
        </section>`;
      host.appendChild(wrap);
    });

    // нээх/хаах
    $$('.oy-item[data-menu]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.menu;
        const pane = $(`.oy-pane[data-pane="${key}"]`);
        if (!pane) return;
        pane.hidden = !pane.hidden;
      });
    });

    // action товч
    $$('.oy-mini').forEach(b=>{
      b.addEventListener('click', ()=>{
        window.oySend?.(b.dataset.mod, b.dataset.act);
      });
    });
  })();

  /* ---------- Chat helpers ---------- */
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
    const MAX = 2000; let store = html;
    if (isHTML && /<img\s/i.test(html)) store = "[image]";
    else if (String(html).length > MAX) store = String(html).slice(0, MAX) + "…";
    try{
      const arr = loadMsgs(); arr.push({ t: Date.now(), who, html: store, isHTML:false });
      localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
    }catch(_){}
  }

  (function redraw(){
    el.stream.innerHTML=''; const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  })();

  function showTyping(){ el.typing.hidden = false; }
  function hideTyping(){ el.typing.hidden = true; }

  // file -> dataURL
  function fileToDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // preview chips
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

  // robust reply extractor
  function pickReply(j){
    return (
      j?.reply ??
      j?.message ??
      j?.choices?.[0]?.message?.content ??
      j?.output?.[0]?.content?.find?.(c => c.type === 'text')?.text ??
      j?.output?.[0]?.content?.[0]?.text ??
      j?.content ?? ""
    );
  }

  /* ---------- API call (/v1/chat) ---------- */
  async function callChat({ text="", images=[] }){
    const API = (window.OY_API_BASE || "").replace(/\/+$/,''); // remove trailing /
    if (!API){ bubble("⚠️ API тохируулга хийгдээгүй (window.OY_API_BASE).", 'bot'); return; }
    showTyping();
    try{
      const USER_LANG = (navigator.language || 'mn').split('-')[0];
      const r = await fetch(`${API}/v1/chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          moduleId: CURRENT_MODULE, text, images,
          chatHistory: HISTORY, userLang: USER_LANG
        })
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const reply = (pickReply(data) || "").trim();

      if (!reply){ bubble("… (хоосон хариу ирлээ)", "bot"); }
      else {
        bubble(reply, 'bot'); pushMsg('bot', reply);
        HISTORY.push({ role:'assistant', content: reply });
      }
      if (data?.model) meta(`Model: ${data.model}`);
    }catch(e){
      console.error(e);
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
      // чат дээр харагдуулах (жижигрүүлсэн)
      imgs.forEach(d=>{
        bubble(`<img class="oy-img" src="${d}" alt="image">`,'user',true);
        pushMsg('user', `<img src="${d}">`, true);
      });
    }
    el.input.value = ""; previewImages = []; renderPreviews();
    await callChat({ text: t, images: imgs });
  }

  el.send?.addEventListener('click', sendCurrent);
  el.input?.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendCurrent(); }
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

  /* ---------- Menu public API ---------- */
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text,'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content: text });
    const imgs = [...previewImages]; previewImages = []; renderPreviews();
    await callChat({ text, images: imgs });
  };

})();
