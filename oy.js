// oy.js — minimal, working
(()=> {
  if (window.__OY_BOOTED__) return; window.__OY_BOOTED__ = true;
  const $ = (s, r=document)=>r.querySelector(s);

  /* ---------- Elements ---------- */
  const el = {
    stream: $('#oyStream'),
    input:  $('#oyInput'),
    send:   $('#btnSend'),
    file:   $('#oyFile'),
    typing: $('#typing'),
    themePicker: $('#themePicker'),
  };

  /* ---------- Themes (5) ---------- */
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
  }

  /* ---------- Small chat store ---------- */
  const MSGKEY = 'oy_simple_msgs';
  const esc = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m]));
  const scrollBottom = ()=>{ el.stream.scrollTop = el.stream.scrollHeight + 999; };
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
  function showTyping(){ el.typing && (el.typing.hidden=false); }
  function hideTyping(){ el.typing && (el.typing.hidden=true); }

  /* ---------- Image preview (optional) ---------- */
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

  /* ---------- SEND (✅ await зөвхөн async дотор) ---------- */
  async function send(){
    const t = (el.input?.value || '').trim();
    if(!t) return;

    bubble(t, 'user'); pushMsg('user', t);
    el.input.value=''; el.send.disabled = true; showTyping();

    const hist = loadMsgs().slice(-12);
    const modelToUse = t.length > 220 ? 'gpt-4o' : 'gpt-4o-mini'; // 2 модель автоматаар

    try{
      const r = await fetch('/api/oy-chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:   modelToUse,
          persona: 'soft',
          msg:     t,
          history: hist
        })
      });

      const {reply,error} = await r.json().catch(()=>({error:'Invalid JSON'}));
      hideTyping(); el.send.disabled = false;
      if (error) throw new Error(error);

      bubble(reply || '...', 'bot'); pushMsg('bot', reply || '...');
    }catch(e){
      hideTyping(); el.send.disabled = false;
      bubble('⚠️ API алдаа: '+(e?.message||e), 'bot');
    }
  }

  /* ---------- Events ---------- */
  el.send?.addEventListener('click', send);
  el.input?.addEventListener('keydown', e=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });

  /* ---------- Boot ---------- */
  renderThemePicker();
  (function redraw(){
    const arr = loadMsgs();
    if (!arr.length){
      bubble('Сайн уу! Энэ бол Оюунсанаатай ганц чат. Туршаад үзье. 🌿','bot');
    } else {
      arr.forEach(m=> bubble(m.html, m.who, m.isHTML));
    }
  })();
})();
