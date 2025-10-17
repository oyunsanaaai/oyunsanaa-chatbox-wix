(()=> {
  if (window.__OY_BOOTED__) return; window.__OY_BOOTED__ = true;
  const $ = (s, r=document) => r.querySelector(s);

  const el = {
    overlay: $('#oyOverlay'),
    drawer: $('#oyDrawer'),
    btnDrawer: $('#btnDrawer'),
    stream: $('#oyStream'),
    input: $('#oyInput'),
    send: $('#btnSend'),
    file: $('#oyFile'),
    previews: $('#oyPreviews'),
    typing: $('#typing'),
    themePicker: $('#themePicker'),
    chatTitle: $('#chatTitle'),
  };

  /* ---------- THEMES ---------- */
  const THEMES = [
    {name:'Blue', grad:['#0d1726','#1d2740']},
    {name:'Green', grad:['#081a16','#12322b']},
    {name:'Gold', grad:['#1b140b','#332515']},
    {name:'Gray', grad:['#0f1114','#191b22']},
    {name:'Teal', grad:['#0a2021','#143638']},
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }
  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const b=document.createElement('button'); b.className='oy-swatch';
      b.innerHTML=`<i style="background:linear-gradient(135deg,${t.grad[0]},${t.grad[1]})"></i>`;
      b.title=t.name;
      b.addEventListener('click',()=>{localStorage.setItem(THEME_KEY,String(i));applyTheme(i);});
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  /* ---------- DRAWER ---------- */
  el.btnDrawer?.addEventListener('click',()=>{
    const opened=document.body.classList.toggle('oy-drawer-open');
    if(el.overlay)el.overlay.hidden=!opened;
  });
  el.overlay?.addEventListener('click',()=>{
    document.body.classList.remove('oy-drawer-open');
    if(el.overlay)el.overlay.hidden=true;
  });

  /* ---------- MESSAGE ---------- */
  const MSGKEY='oy_msgs_v1';
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const scrollBottom=()=>el.stream?.scrollTo({top:el.stream.scrollHeight,behavior:'smooth'});

  function bubble(html,who='bot',isHTML=false){
    const d=document.createElement('div');
    d.className='oy-bubble '+(who==='user'?'oy-user':'oy-bot');
    d.innerHTML=isHTML?html:esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }

  function showTyping(){
    if(!el.typing)return;
    el.typing.setAttribute('aria-hidden','false');
    clearTimeout(window.__oyTypingTimer);
    window.__oyTypingTimer=setTimeout(()=>el.typing.setAttribute('aria-hidden','true'),1500);
  }

  /* ---------- FILE PREVIEW ---------- */
  let previewImages=[];
  function renderPreviews(){
    if(!el.previews)return;
    if(!previewImages.length){el.previews.hidden=true;el.previews.innerHTML='';return;}
    el.previews.hidden=false;
    el.previews.innerHTML=previewImages.map((d,i)=>`<div class="oy-chip"><img src="${d}"/><button data-i="${i}">×</button></div>`).join('');
    el.previews.querySelectorAll('button').forEach(btn=>{
      btn.onclick=()=>{previewImages.splice(+btn.dataset.i,1);renderPreviews();}
    });
  }

  el.file?.addEventListener('change',async e=>{
    const files=Array.from(e.target.files||[]);
    for(const f of files)if(f.type.startsWith('image/')){
      const r=new FileReader();
      r.onload=()=>{previewImages.push(r.result);renderPreviews();};
      r.readAsDataURL(f);
    }
    e.target.value="";
  });

  /* ---------- SEND ---------- */
  async function sendMessage(){
    const text=(el.input?.value||'').trim();
    if(!text&&!previewImages.length)return;
    if(text){bubble(text,'user');}
    previewImages.forEach(d=>bubble(`<img src="${d}">`,'user',true));
    el.input.value='';previewImages=[];renderPreviews();showTyping();

    setTimeout(()=>{bubble('Ойлголоо 😊','bot');},1000);
  }

  el.send?.addEventListener('click',sendMessage);
  el.input?.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
  });

})();
