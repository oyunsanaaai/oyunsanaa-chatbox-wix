(()=>{

  if (window.__OY_BOOTED__) return; window.__OY_BOOTED__ = true;

  /* ---------- shorthands ---------- */
  const $ = (s, r=document) => r.querySelector(s);
  const el = {
    stream:   $('#oyStream'),
    input:    $('#oyInput'),
    send:     $('#btnSend'),
    file:     $('#oyFile'),
    previews: $('#oyPreviews'),
    typing:   $('#typing'),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };

  /* ---------- Themes ---------- */
  const THEMES = [
    {name:'Blue',  grad:['#274272','#142033']},
    {name:'Mint',  grad:['#0e3a31','#174d41']},
    {name:'Gold',  grad:['#3a2a12','#201709']},
    {name:'Gray',  grad:['#15191f','#0f1317']},
    {name:'Teal',  grad:['#0d2c2e','#102f30']},
  ];
  const THEME_KEY='oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }
  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML='';
    THEMES.forEach((t,i)=>{
      const b=document.createElement('button'); b.className='oy-swatch';
      b.innerHTML=`<i style="background:linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})"></i>`;
      b.title=t.name; b.addEventListener('click',()=>{localStorage.setItem(THEME_KEY,String(i));applyTheme(i);});
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  /* ---------- helpers ---------- */
  const OY_API = window.OY_API_BASE || "";
  const CHAT_URL = OY_API ? `${OY_API}/v1/chat` : "";
  const MSGKEY = 'oy_msgs';
  const esc = s => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function scrollBottom(){ el.stream?.scrollTo({top: el.stream.scrollHeight + 999, behavior:'smooth'}); }

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who==='user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){ const m=document.createElement('div'); m.className='oy-meta'; m.textContent=t; el.stream.appendChild(m); scrollBottom(); }

  function showTyping(){ if (el.typing) el.typing.hidden=false; }
  function hideTyping(){ if (el.typing) el.typing.hidden=true; }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html){
    try{
      const arr = loadMsgs(); arr.push({t:Date.now(),who,html}); localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-40)));
    }catch(_){}
  }
  (function redraw(){
    if (!el.stream) return;
    el.stream.innerHTML=''; const arr=loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else arr.forEach(m=>bubble(m.html,m.who,true));
  })();

  // file to dataURL
  function fileToDataURL(file){
    return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); });
  }

  // previews
  let previewImages=[];
  function renderPreviews(){
    if (!el.previews) return;
    if (!previewImages.length){ el.previews.hidden=true; el.previews.innerHTML=''; return; }
    el.previews.hidden=false;
    el.previews.innerHTML = previewImages.map((d,i)=>(
      `<div class="oy-chip"><img src="${d}" alt=""><button data-i="${i}">×</button></div>`
    )).join('');
    el.previews.querySelectorAll('button').forEach(b=>{
      b.onclick=()=>{ const i=+b.dataset.i; previewImages.splice(i,1); renderPreviews(); };
    });
  }

  /* ---------- Chat state ---------- */
  let HISTORY=[];
  let CURRENT_MODULE='psychology';
  let SENDING=false;

  function pickReply(j){
    // robust extractor: таны Worker "output: [{role, content:[{type:'text', text}]}]" буцаадаг
    return (
      j?.output?.[0]?.content?.find?.(c=>c.type==='text')?.text ||
      j?.output?.[0]?.content?.[0]?.text ||
      j?.reply || j?.message || ""
    );
  }

  async function callChat({text="", images=[]}){
    if (!CHAT_URL){ bubble("⚠️ API тохируулга хийгдээгүй (OY_API_BASE).", 'bot'); return; }
    if (SENDING) return; SENDING=true;
    showTyping();
    try{
      const USER_LANG = (window.OY_LANG || navigator.language || 'mn').split('-')[0];
      const r = await fetch(CHAT_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ moduleId: CURRENT_MODULE, text, images, chatHistory: HISTORY, userLang: USER_LANG })
      });
      const data = await r.json();
      const reply = (pickReply(data) || "…").trim();
      bubble(reply,'bot'); pushMsg('bot', reply); HISTORY.push({role:'assistant',content:reply});
      if (data?.model) meta(`Model: ${data.model}`);
    }catch(e){
      console.error(e); bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.",'bot');
    }finally{
      hideTyping(); SENDING=false;
    }
  }

  async function sendCurrent(){
    const t = (el.input?.value || "").trim();
    if (!t && !previewImages.length) return;

    if (t){ bubble(t,'user'); pushMsg('user', t); HISTORY.push({role:'user',content:t}); }
    const imgs = [...previewImages];
    if (imgs.length){
      imgs.forEach(d=>{
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
        pushMsg('user', `<img src="${d}">`);
      });
    }
    el.input.value=""; previewImages=[]; renderPreviews();
    await callChat({text:t, images:imgs});
  }

  // bind
  function bindOnce(target, evt, fn){
    if (!target) return; target.__oybind=target.__oybind||{};
    const old=target.__oybind[evt]; if (old) target.removeEventListener(evt,old);
    target.addEventListener(evt,fn); target.__oybind[evt]=fn;
  }
  bindOnce(el.send, 'click', sendCurrent);
  bindOnce(el.input, 'keydown', e=>{
    if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendCurrent(); }
  });
  bindOnce(el.input, 'focus', ()=>{ setTimeout(scrollBottom, 50); });
  bindOnce(el.file, 'change', async (e)=>{
    const files = Array.from(e.target.files||[]); if (!files.length) return;
    for (const f of files){ if (f.type.startsWith('image/')) previewImages.push(await fileToDataURL(f)); }
    e.target.value=""; renderPreviews(); el.input?.focus();
  });

})();
