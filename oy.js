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

