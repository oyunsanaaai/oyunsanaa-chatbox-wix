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
  };

  /* ---------- Themes ---------- */
  const THEMES = [
    {name:'Blue',  grad:['#4e7dd8','#1a2538']},
    {name:'Green', grad:['#1aa86e','#162a23']},
    {name:'Gold',  grad:['#bc9b5d','#2a2312']},
    {name:'Gray',  grad:['#8b8f96','#1c1f24']},
    {name:'Teal',  grad:['#2e6f6c','#112425']},
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }
  (function renderThemes(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const b = document.createElement('button');
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})"></i>`;
      b.title = t.name;
      b.addEventListener('click', ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(i); });
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY) || 0);
  })();

  /* ---------- Drawer (mobile) ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = true;
  });

  /* ---------- Utils ---------- */
 window.OY_API_BASE = "https://oyunsanaa-api.oyunsanaa-ai.workers.dev";
  const MSGKEY = 'oy_msgs_cache';
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const scrollBottom = () => { el.stream?.scrollTo({ top: el.stream.scrollHeight + 999, behavior:'smooth' }); };

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function showTyping(){ if (el.typing) el.typing.style.display = 'flex'; }
  function hideTyping(){ if (el.typing) el.typing.style.display = 'none'; }

  // autosize textarea
  (function autosize(){
    const ta = el.input; if (!ta) return;
    const fit = ()=>{ ta.style.height='auto'; ta.style.height=Math.min(180, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', fit); fit();
  })();

  // localStorage cache (light)
  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, text){
    try{
      const arr = loadMsgs(); arr.push({t:Date.now(), who, text: String(text).slice(0,2000)});
      localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-40)));
    }catch(_){}
  }
  (function redraw(){
    el.stream.innerHTML='';
    const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Эндээс ярилцъя. 🌿','bot'); }
    else { arr.forEach(m => bubble(m.text, m.who)); }
  })();

  /* ---------- Image preview ---------- */
  function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }
  let previewImages = [];
  function renderPreviews(){
    if (!el.previews) return;
    if (!previewImages.length){ el.previews.hidden = true; el.previews.innerHTML=''; return; }
    el.previews.hidden = false;
    el.previews.innerHTML = previewImages.map((d,i)=>(
      `<div class="oy-chip"><img src="${d}" alt=""><button data-i="${i}">×</button></div>`
    )).join('');
    el.previews.querySelectorAll('button').forEach(btn=>{
      btn.onclick = ()=>{ const i = +btn.dataset.i; previewImages.splice(i,1); renderPreviews(); };
    });
  }
  el.file?.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files||[]);
    for (const f of files){ if (f.type.startsWith('image/')) previewImages.push(await fileToDataURL(f)); }
    e.target.value=""; renderPreviews(); el.input?.focus();
  });

  /* ---------- API call ---------- */
  function pickReply(j){
    return (
      j?.output?.[0]?.content?.find?.(c => c.type==='text' || c.type==='output_text')?.text ??
      j?.output?.[0]?.content?.[0]?.text ??
      j?.reply ?? j?.message ?? ""
    );
  }

  async function callChat({text="", images=[]}){
    if (!OY_API){ bubble("⚠️ API тохируулга хийгдээгүй (OY_API_BASE).","bot"); return; }
    showTyping();
    try{
      const USER_LANG = (window.OY_LANG || navigator.language || 'mn').split('-')[0];
      const r = await fetch(`${OY_API}/v1/chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ moduleId: CURRENT_MODULE, text, images, chatHistory: HISTORY, userLang: USER_LANG })
      });
      const data = await r.json();
      const reply = (pickReply(data) || "").trim();
      if (reply){ bubble(reply,'bot'); pushMsg('bot', reply); HISTORY.push({role:'assistant', content:reply}); }
      else { bubble("… (хоосон хариу ирлээ)","bot"); }
    }catch(e){
      console.error(e); bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.","bot");
    }finally{ hideTyping(); }
  }

  /* ---------- State & send ---------- */
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';

  async function sendCurrent(){
    const t = (el.input?.value || "").trim();
    if (!t && !previewImages.length) return;

    if (t){ bubble(t,'user'); pushMsg('user', t); HISTORY.push({role:'user', content:t}); }
    const imgs = [...previewImages];
    if (imgs.length){
      imgs.forEach(d=>{
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
        pushMsg('user', "[image]");
      });
    }
    el.input.value = ""; previewImages = []; renderPreviews();
    await callChat({ text: t, images: imgs });
  }

  el.send?.addEventListener('click', sendCurrent);
  el.input?.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendCurrent(); }
  });

  /* ---------- Menu open/close ---------- */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const pane = document.querySelector(`.oy-pane[data-pane="${key}"]`);
      if (!pane) return;
      pane.hidden = !pane.hidden;
      document.querySelectorAll('.oy-pane').forEach(p => { if (p!==pane) p.hidden = true; });
    });
  });

  /* ---------- Public action ---------- */
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text,'user'); pushMsg('user', text); HISTORY.push({role:'user', content:text});
    const imgs = [...previewImages]; previewImages = []; renderPreviews();
    await callChat({ text, images: imgs });
  };

})();
