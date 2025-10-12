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
    if(saved){ el.chatTitle.textContent = 'Оюунсанаа — ' + saved; }
    else{ el.chatTitle.textContent = 'Оюунсанаа — Чат'; }
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
      el.panes.forEach(p=>p.hidden = p!==target)
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
     // файлын дээд талд нэг мөр нэмж өг
const API_BASE = "https://api-hugjuulelt-bice.vercel.app";

// дараа нь fetch ийм болно
const r = await fetch(`${API_BASE}/api/oy-chat`, {
  method:'POST',
  headers:{'Content-Type':'application/json'},
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
/* ===== iOS keyboard / viewport fix ===== */
// ===== SEND HANDLERS (final) =====
document.addEventListener('DOMContentLoaded', () => {
  const ta  = document.getElementById('oyInput');
  const btn = document.getElementById('btnSend');

  async function handleSend(){
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) return;

    // UI: disable while sending
    btn && (btn.disabled = true);

    try {
      // ↓↓↓ ЭНД ТАНЫ ОДООХ API URL-ыг тавина ↓↓↓
      const API_URL = '/api/chat'; // <-- өөрийнхөө одоо ашиглаж байсан URL-аа энд тавь
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: text })
      });

      // илгээсний дараа талбарыг цэвэрлээд доош наана
      ta.value = '';
      requestAnimationFrame(() => {
        document.getElementById('oyStream')?.scrollTo({top: 1e9, behavior: 'smooth'});
      });

      // Хэрвээ та streaming хэрэглэдэг бол энд өөр код яваа байж болно.
      if (!res.ok) {
        console.error('Send failed', await res.text());
      }
    } catch (e) {
      console.error('Network error', e);
    } finally {
      btn && (btn.disabled = false);
    }
  }

  // Click
  btn?.addEventListener('click', handleSend);

  // Enter (Shift+Enter = шинэ мөр)
  ta?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
});
/* ===== iOS keyboard / visualViewport: ONE TRUE BLOCK ===== */
(() => {
  const ua = navigator.userAgent || '';
  const IS_IOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  if (!IS_IOS) return;

  const vv     = window.visualViewport;
  const root   = document.documentElement;
  const stream = document.getElementById('oyStream');
  const input  = document.getElementById('oyInput');

  function applyKb(){
    if (!vv) return;
    // keyboard өндөр ≈ window.innerHeight - vv.height
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height));
    root.style.setProperty('--kb', kb + 'px');
  }

  vv?.addEventListener('resize', applyKb);
  vv?.addEventListener('scroll',  applyKb);
  window.addEventListener('orientationchange', () => setTimeout(applyKb, 200));
  applyKb();

  // фокус авахад доош нь наана (инпут харагдаж байх)
  input?.addEventListener('focus', () => {
    setTimeout(() => stream?.scrollTo({top: 1e9, behavior: 'smooth'}), 50);
  });
})();
// === iOS keyboard/viewport тогтворжуулах ===
(function(){
  if (window.__oy_vv_bound) return;
  window.__oy_vv_bound = true;

  const vv = window.visualViewport;
  const stream = document.getElementById('oyStream');
  const bar = document.getElementById('inputBar');

  // Доод талд динамик зай (padding) барих spacer
  let spacer = document.querySelector('.oy-stream-bottom-pad');
  if (!spacer){
    spacer = document.createElement('div');
    spacer.className = 'oy-stream-bottom-pad';
    stream.appendChild(spacer);
  }

  function applySafeBottom(){
    const inset = Number(getComputedStyle(document.documentElement)
      .getPropertyValue('env(safe-area-inset-bottom)').replace('px','')) || 0;
    spacer.style.height = (bar.offsetHeight + inset) + 'px';
    // үргэлж доош нь харагдуулна
    stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
  }

  // textarea дээр фокус авахад шууд доош ойртуулна
  const ta = document.getElementById('oyInput');
  ta.addEventListener('focus', () => {
    setTimeout(applySafeBottom, 50);
  });
  ta.addEventListener('blur', () => {
    spacer.style.height = bar.offsetHeight + 'px';
  });

  // visualViewport өөрчлөгдөх бүрт (keyboard гар/орох) тохируулна
  if (vv){
    vv.addEventListener('resize', applySafeBottom);
    vv.addEventListener('scroll', applySafeBottom);
  }
  // эхний тооцоо
  window.addEventListener('load', applySafeBottom);
})();
<script>
(()=> {
  // -------- CONFIG --------
  const TRIAL_LIMIT = 10;
  const KEYS = {
    member: 'oy_member_v1',
    guest:  'oy_guest_v1',
    trialCount: 'oy_trial_count_v1',
    remember: 'oy_remember_v1'
  };

  // -------- HELPERS --------
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const byId = id => document.getElementById(id);

  function showOverlay(){ const ov=byId('oyLoginOverlay'); if(ov){ ov.style.display='flex'; document.body.style.overflow='hidden'; } }
  function hideOverlay(){ const ov=byId('oyLoginOverlay'); if(ov){ ov.style.display='none'; document.body.style.overflow=''; } }

  function isMember(){ return localStorage.getItem(KEYS.member)==='1'; }
  function isGuest(){  return localStorage.getItem(KEYS.guest)==='1'; }
  function getCount(){ return +(localStorage.getItem(KEYS.trialCount)||0); }
  function setCount(n){ localStorage.setItem(KEYS.trialCount, String(n)); }

  function markMember(persist=true){
    localStorage.setItem(KEYS.member,'1');
    localStorage.removeItem(KEYS.guest);
    localStorage.removeItem(KEYS.trialCount);
    if (persist) localStorage.setItem(KEYS.remember,'1'); else localStorage.removeItem(KEYS.remember);
  }
  function markGuest(){
    localStorage.setItem(KEYS.guest,'1');
    localStorage.removeItem(KEYS.member);
    if (!localStorage.getItem(KEYS.trialCount)) setCount(0);
  }

  // -------- UI: Trial lock banner --------
  function ensureLockBanner(){
    if (byId('oyTrialLock')) return byId('oyTrialLock');
    const div = document.createElement('div');
    div.id = 'oyTrialLock';
    div.style.cssText = `
      position:fixed; left:50%; bottom:18px; transform:translateX(-50%);
      max-width:min(92vw,680px); z-index:9998;
      background:rgba(0,0,0,.65); color:#fff; border:1px solid rgba(255,255,255,.25);
      border-radius:14px; padding:12px 14px; display:none; backdrop-filter:blur(10px);
      box-shadow:0 18px 40px rgba(0,0,0,.25); font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;
    `;
    div.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div id="oyLockMsg">Туршилтын 10 асуулт дууслаа. Үргэлжлүүлэхийн тулд бүртгүүлнэ үү.</div>
        <div style="display:flex;gap:8px">
          <a href="https://oyunsanaa.com" target="_top" rel="noopener"
             style="text-decoration:none;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:linear-gradient(90deg,#3aa26d,#1f8a53);color:#fff;font-weight:700">
            Бүртгүүлэх
          </a>
          <button id="oyLockClose" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;cursor:pointer">
            Хожим
          </button>
        </div>
      </div>`;
    document.body.appendChild(div);
    byId('oyLockClose')?.addEventListener('click', ()=>{ div.style.display='none'; });
    return div;
  }

  function disableComposer(disabled){
    const ta  = byId('oyInput');    // таны чатны textarea (аль хэдийн байгаа)
    const btn = byId('btnSend');    // таны илгээх товч
    if (ta)  { ta.disabled = disabled; ta.placeholder = disabled ? 'Туршилтын 10 асуулт дууссан.' : ta.placeholder; }
    if (btn) { btn.disabled = disabled; }
  }

  function onGuestMessageSent(){
    // зочны тоолуур өсгөнө
    const n = getCount() + 1;
    setCount(n);
    if (n >= TRIAL_LIMIT){
      // түгжинэ
      ensureLockBanner().style.display = 'block';
      disableComposer(true);
    }
  }

  // -------- Hook чат илгээхэд --------
  function bindSendHooks(){
    const ta  = byId('oyInput');
    const btn = byId('btnSend');

    // 1) Товч дарсан үед
    btn?.addEventListener('click', ()=>{ if (isGuest()) onGuestMessageSent(); }, {capture:true});

    // 2) Enter (Shift+Enter = шинэ мөр)
    ta?.addEventListener('keydown', (e)=>{
      if (e.key==='Enter' && !e.shiftKey){
        if (isGuest()) onGuestMessageSent();
      }
    }, {capture:true});

    // 3) Fallback — DOM дээр хэрэглэгчийн мессеж нэмэгдэж буйг ажиглах
    const stream = byId('oyStream');
    if (stream && 'MutationObserver' in window){
      const mo = new MutationObserver((muts)=>{
        muts.forEach(m=>{
          m.addedNodes && m.addedNodes.forEach(node=>{
            if (!(node instanceof HTMLElement)) return;
            // таны кодонд хэрэглэгчийн бөмбөлөг class нь .oy-user байсан
            if (node.classList && node.classList.contains('oy-user') && isGuest()){
              onGuestMessageSent();
            }
          });
        });
      });
      mo.observe(stream, {childList:true});
    }
  }

  // -------- Login overlay actions --------
  function bindLogin(){
    const btnLogin = byId('loginBtn');
    const btnNew   = byId('newUserBtn');
    const remember = byId('oyRemember');
    const email    = byId('oyUser');
    const pass     = byId('oyPass');

    // Шинэ хэрэглэгч → шууд сайт руу (HTML дээрээ аль хэдийн линктэй байгаа)
    btnNew?.addEventListener('click', (e)=>{
      // a/link биш button байж болзошгүй тул давхар хамгаалалт
    });

    btnLogin?.addEventListener('click', ()=>{
      const hasCreds = (email && email.value.trim()) || (pass && pass.value.trim());
      if (hasCreds){
        // Гишүүн: лимитгүй
        markMember(remember ? !!remember.checked : true);
      } else {
        // Хоосон дарвал: Туршилт горим (10 асуулт)
        markGuest();
      }
      hideOverlay();
      // Туршилт нь өмнө лимит хэтэрсэн байсан бол composer-ийг буцааж нээхгүй
      if (isGuest() && getCount() >= TRIAL_LIMIT){
        ensureLockBanner().style.display='block';
        disableComposer(true);
      } else {
        disableComposer(false);
      }
    });
  }

  // -------- BOOT --------
  document.addEventListener('DOMContentLoaded', ()=>{
    // Нэвтэрсэн бол overlay үзүүлэхгүй
    if (isMember()){
      hideOverlay();
      disableComposer(false);
    }else{
      // Хэрвээ өмнө trial эхлүүлсэн бол overlay-г дахин битгий гарга
      if (isGuest()){
        hideOverlay();
        if (getCount() >= TRIAL_LIMIT){
          ensureLockBanner().style.display='block';
          disableComposer(true);
        }
      }else{
        showOverlay();
      }
    }
    bindLogin();
    bindSendHooks();
  });

})();
</script>
