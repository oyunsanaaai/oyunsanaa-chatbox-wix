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
  };

  /* ---------- THEME (5 өнгө) ---------- */
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

  /* ---------- Насны ангилал / Бүртгэл ---------- */
  const AGE_KEY = 'oy_age_choice';
  function updateTitleFromAge(){
    const saved = localStorage.getItem(AGE_KEY);
    if(saved){ el.chatTitle.textContent = 'oyunsanaa — ' + saved; }
    else{ el.chatTitle.textContent = 'oyunsanaa — Чат'; }
  }
  $('#btnRegister')?.addEventListener('click', (e)=>{
    e.preventDefault();
    const form = $('#ageForm'); if(!form){ return; }
    const sel = form.querySelector('input[name="age"]:checked');
    if(!sel){ alert('Эхлээд насны ангилал сонгоно уу.'); return; }
    const label = sel.parentElement.textContent.trim();
    localStorage.setItem(AGE_KEY, label);
    updateTitleFromAge();
    // Хэрвээ Wix рүү чиглүүлэх бол энд линкээ тавина:
    // location.href = 'https://YOUR-WIX-SITE.com/checkout?age=' + encodeURIComponent(label);
    alert('Сонголт хадгалагдлаа. Бүртгэл рүү шилжүүлж болно.');
  });
  updateTitleFromAge();

  /* ---------- Меню toggle (pane нь яг дороо гарна) ---------- */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const target = Array.from(el.panes).find(p=>p.dataset.pane===key);
      if(!target) return;
      // ижил товчийг дахин дарвал хаана
      if (!target.hidden) { target.hidden = true; return; }
      // бусдыг хааж зөвхөн өөрийг нь нээнэ
      el.panes.forEach(p=>p.hidden = p!==target);
      document.body.classList.remove('oy-drawer-open'); if(el.overlay) el.overlay.hidden = true;
    });
  });

  /* ---------- Drawer (mobile) ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if(el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); if(el.overlay) el.overlay.hidden = true;
  });

  /* ---------- ЧАТ ---------- */
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

  function showTyping(){ el.typing.hidden = false; }
  function hideTyping(){ el.typing.hidden = true; }

  // Зураг preview
  $('#oyFile')?.addEventListener('change', e=>{
    const files = Array.from(e.target.files||[]);
    if (!files.length) return;
    files.forEach(f=>{
      if (!f.type.startsWith('image/')){
        bubble('📎 '+f.name+' (зураг биш тул нэрийг илгээв)','user'); pushMsg('user', f.name); return;
      }
      const url = URL.createObjectURL(f);
      bubble(`<div class="oy-imgwrap"><img src="${url}" alt=""></div>`,'user',true);
      pushMsg('user', `<img src="${url}">`, true);
      setTimeout(()=>URL.revokeObjectURL(url),4000);
    });
    e.target.value='';
  });

  // Илгээх
  async function send(){
    const t = (el.input.value||'').trim(); if(!t) return;
    bubble(t,'user'); pushMsg('user', t); el.input.value=''; showTyping(); el.send.disabled=true;

    try{
      const history = loadMsgs().slice(-12);
      const r = await fetch('/api/oy-chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model: (t.length>220?'gpt-4o':'gpt-4o-mini'),
          persona:'soft',
          msg:t,
          chatSlug:'one-chat',
          history
        })
      });
      const {reply,error} = await r.json().catch(()=>({error:'Invalid JSON'}));
      hideTyping(); el.send.disabled=false;
      if (error) throw new Error(error);
      bubble(reply||'...','bot'); pushMsg('bot', reply||'...');
    }catch(e){
      hideTyping(); el.send.disabled=false;
      bubble('⚠️ Холболт эсвэл API тохиргоо дутуу байна.','bot');
    }
  }
  el.send?.addEventListener('click', send);
  el.input?.addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });

  /* ---------- BOOT ---------- */
  renderThemePicker();
  redraw();
})();
console.log("oy.js loaded ✅");

(() => {
  /* -------- Туслах -------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* -------- Элементүүд -------- */
  const el = {
    stream: $('#oyStream'),
    input:  $('#oyInput'),
    send:   $('#btnSend'),
    file:   $('#oyFile'),
    typing: $('#typing'),
    themePicker: $('#themePicker'),
  };

  /* -------- Сэдэв (theme) -------- */
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
  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'oy-swatch';
      b.title = t.name;
      b.innerHTML = `<i style="background:linear-gradient(135deg,${t.bg1},${t.bg2})"></i>`;
      b.onclick = ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(t); };
      el.themePicker.appendChild(b);
    });
    const idx = +localStorage.getItem(THEME_KEY) || 0;
    applyTheme(THEMES[idx] || THEMES[0]);
  })();

  /* -------- Чат санах ой (simple) -------- */
  const MSGKEY = 'oy_simple_msgs';
  const esc = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m]));
  const scrollBottom = (smooth=false)=> el.stream?.scrollTo({ top: el.stream.scrollHeight+999, behavior: smooth?'smooth':'auto' });
  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who==='user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom();
  }
  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch{ return []; } }
  function pushMsg(who, html, isHTML=false){
    const arr = loadMsgs(); arr.push({t:Date.now(), who, html, isHTML});
    localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
  }

  /* -------- Мобайл keyboard тусламж -------- */
  (function mobileHelp(){
    const input = el.input, stream = el.stream;
    const ro = new ResizeObserver(()=> setTimeout(()=> scrollBottom(false), 100));
    ro.observe(document.documentElement);
    input?.addEventListener('focus', ()=> setTimeout(()=> { scrollBottom(true); try{ window.scrollTo(0, document.body.scrollHeight);}catch{} }, 150));
  })();

  /* -------- Зураг/файл (сонголттой) -------- */
  el.file?.addEventListener('change', e=>{
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    files.forEach(f=>{
      if(!f.type.startsWith('image/')){ bubble('📎 '+f.name,'user'); pushMsg('user', f.name); return; }
      const url = URL.createObjectURL(f);
      bubble(`<div class="oy-imgwrap"><img src="${url}" alt=""></div>`, 'user', true);
      pushMsg('user', `<img src="${url}">`, true);
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
    });
    e.target.value='';
  });

  /* -------- Илгээх -------- */
  async function send(){
    const t = (el.input?.value || '').trim();
    if(!t) return;

    bubble(t, 'user'); pushMsg('user', t);
    el.input.value=''; el.send.disabled = true; el.typing && (el.typing.hidden=false);

    // Энд туршилтаар API-г идэвхгүй байлгаж болно (reply fake)
    // Жинхэнэ API хэрэглэх бол доорх fetch-ийг нээ.
    try{
      // const API_BASE = 'https://ТАНЫ-ДОМЭЙН-эсвэл-WIX'; // Wix HTTP Functions ашиглавал таны домэйн
      // const r = await fetch(`${API_BASE}/_functions/oyChat`, {
      //   method:'POST',
      //   headers:{ 'Content-Type':'application/json' },
      //   body: JSON.stringify({ model:'gpt-4o-mini', msg: t, history: loadMsgs().slice(-12) })
      // });
      // const {reply,error} = await r.json().catch(()=>({error:'Invalid JSON'}));
      // if (error) throw new Error(error);
      // bubble(reply || '...', 'bot'); pushMsg('bot', reply || '...');

      // ← Одоогоор туршилтын offline хариу:
      await new Promise(r=>setTimeout(r,400));
      bubble('ОК, таны мессежийг хүлээж авлаа. 🤝 (API-г дараа холбоно)', 'bot'); pushMsg('bot','ОК, таны мессежийг хүлээж авлаа. 🤝');
    }catch(e){
      bubble('⚠️ API алдаа: '+(e?.message||e), 'bot');
    }finally{
      el.typing && (el.typing.hidden=true); el.send.disabled = false;
    }
  }
  el.send?.addEventListener('click', send);
  el.input?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });

  /* -------- Меню: найдвартай toggle -------- */
  function closeAllPanes() {
    $$('.oy-pane').forEach(p => p.setAttribute('hidden',''));
    $$('.oy-item[data-menu]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-expanded','false'); });
    document.body.classList.remove('oy-drawer-open');
    const ov = $('#oyOverlay'); if (ov){ ov.hidden = true; ov.style.pointerEvents = 'none'; }
  }
  function togglePane(key) {
    const pane = document.querySelector(`.oy-pane[data-pane="${key}"]`);
    const btn  = document.querySelector(`.oy-item[data-menu="${key}"]`);
    if (!pane) return;
    const isOpen = !pane.hasAttribute('hidden');
    if (isOpen) {
      pane.setAttribute('hidden','');
      btn?.classList.remove('active'); btn?.setAttribute('aria-expanded','false');
    } else {
      // Олон панель зэрэг нээмээр байвал дараах мөрийг комментлоорой:
      closeAllPanes();
      pane.removeAttribute('hidden');
      btn?.classList.add('active'); btn?.setAttribute('aria-expanded','true');
    }
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.oy-item[data-menu]');
    if (!btn) return;
    e.preventDefault();
    const key = btn.getAttribute('data-menu');
    if (!key) return;
    togglePane(key);
  }, false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPanes(); });
  closeAllPanes(); // ачааллахад цэвэрлэ

  /* -------- “Бүртгүүлэх” → Wix Signup руу -------- */
  const WIX_SIGNUP_URL = 'https://www.oyunsanaa.com/signup'; // <<< ЭНД ЖИНХЭНЭ URL-аа тавиарай
  $('#btnRegister')?.addEventListener('click', () => {
    const form = $('#ageForm');
    const chosen = form ? new FormData(form).get('age') : null;
    if (!chosen) { alert('Насны ангиллаа сонгоорой.'); return; }
    localStorage.setItem('oy_age', chosen);
    window.location.href = `${WIX_SIGNUP_URL}?age=${encodeURIComponent(chosen)}`;
  });

  /* -------- URL-оос age ирвэл хадгал -------- */
  (function captureAgeFromURL(){
    const urlAge = new URLSearchParams(location.search).get('age');
    if (urlAge) localStorage.setItem('oy_age', urlAge);
  })();

  /* -------- Ачааллахад мессежүүд -------- */
  (function redraw(){
    const arr = loadMsgs();
    if (!arr.length){
      bubble('Сайн уу! Энэ бол Оюунсанаатай ганц чат. Туршаад үзье. 🌿','bot');
    } else {
      arr.forEach(m=> bubble(m.html, m.who, m.isHTML));
      scrollBottom(false);
    }
  })();
})();
/* === Drawer + overlay удирдлага, мобайл tap-н засвар === */
const drawer   = document.getElementById('oyDrawer');
const overlay  = document.getElementById('oyOverlay');
const btnDrw   = document.getElementById('btnDrawer');

function openDrawer(isOpen){
  if(!drawer || !overlay) return;
  drawer.classList.toggle('open', !!isOpen);
  overlay.classList.toggle('show', !!isOpen);
  document.body.classList.toggle('oy-drawer-open', !!isOpen);
}

// 3 зураас
btnDrw && btnDrw.addEventListener('click', () => {
  openDrawer(!drawer.classList.contains('open'));
});

// overlay-г дарвал хаагдана
overlay && overlay.addEventListener('click', () => openDrawer(false));

// Мобайл tap (pointerdown) + click хоёуланг нь сонсоно
['pointerdown','click'].forEach(ev=>{
  document.addEventListener(ev, (e)=>{
    const btn = e.target.closest('.oy-item[data-menu]');
    if(!btn) return;
    e.preventDefault(); // iOS ghost scroll/300ms-ыг таслана

    const key = btn.getAttribute('data-menu');
    document.querySelectorAll('.oy-pane').forEach(p=>{
      p.hidden = (p.dataset.pane !== key);
    });
    openDrawer(false); // цэсийг дармагц хаа
  }, {passive:false});
});



















