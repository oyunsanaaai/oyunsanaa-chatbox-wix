// /public/app.js
const q = (s, r=document) => r.querySelector(s);
const qa = (s, r=document) => [...r.querySelectorAll(s)];

let MODEL = localStorage.getItem('oy:model') || 'mini';
let IMAGE_DATA = null;

// model switch
const btnMini = q('#btnMini'), btnPro = q('#btnPro');
function setModel(m){
  MODEL = m;
  localStorage.setItem('oy:model', m);
  btnMini.classList.toggle('active', m==='mini');
  btnPro.classList.toggle('active',  m==='pro');
}
btnMini.onclick = ()=>setModel('mini');
btnPro.onclick  = ()=>setModel('pro');
setModel(MODEL);

// router (internal panes)
const panes = qa('.pane');
function showPane(key){
  panes.forEach(p=>p.hidden = p.dataset.pane !== key);
  q('#crumb').textContent = key ? `Чат · ${paneTitle(key)}` : 'Чат';
}
function paneTitle(key){
  return ({
    health:'Эрүүл мэнд', finance:'Санхүү', goals:'Зорилго', reminders:'Сануулга',
    journal:'Тэмдэглэл', mind:'Сэтгэл зүй', relations:'Харилцаа', environment:'Орчин', blank:''
  })[key] || key;
}
document.addEventListener('click', (e)=>{
  const ext = e.target.closest('a.ext'); if (ext) return; // external ok
  const btn = e.target.closest('.nav-item[data-menu]');
  if(!btn) return;
  showPane(btn.dataset.menu);
});

// theme presets
const themeMap = {
  ocean:  {bg1:'#0e2a47', bg2:'#0ea5a3'},
  forest: {bg1:'#0b2e27', bg2:'#16a34a'},
  sunset: {bg1:'#2b1a12', bg2:'#ef4444'},
  purple: {bg1:'#1b1430', bg2:'#7c3aed'},
  mono:   {bg1:'#0b1220', bg2:'#64748b'}
};
qa('.theme-dot').forEach(d=>{
  d.onclick=()=>{
    const t = d.dataset.theme;
    const {bg1,bg2} = themeMap[t];
    document.documentElement.style.setProperty('--bg1', bg1);
    document.documentElement.style.setProperty('--bg2', bg2);
    document.body.classList.remove('customized');
    localStorage.setItem('oy:theme', JSON.stringify({type:'preset', bg1,bg2}));
  };
});
const customColor = q('#customColor');
customColor.oninput = ()=>{
  document.documentElement.style.setProperty('--custom', customColor.value);
  document.body.classList.add('customized');
  localStorage.setItem('oy:theme', JSON.stringify({type:'custom', color:customColor.value}));
};
// restore theme
(function restoreTheme(){
  const raw = localStorage.getItem('oy:theme');
  if(!raw) return;
  const t = JSON.parse(raw);
  if(t.type==='preset'){
    document.documentElement.style.setProperty('--bg1', t.bg1);
    document.documentElement.style.setProperty('--bg2', t.bg2);
    document.body.classList.remove('customized');
  } else if(t.type==='custom'){
    document.documentElement.style.setProperty('--custom', t.color);
    document.body.classList.add('customized');
  }
})();

// chat wiring
const thread = q('#thread');
const msg = q('#msg');
const send = q('#send');
const imgInput = q('#imgInput');

imgInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const b64 = await fileToDataURL(file);
  IMAGE_DATA = b64;
  // preview bubble
  addBubble('me', '(зураг илгээхэд бэлэн)', b64);
});

send.onclick = onSend;
msg.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }});

function addBubble(who, text, img){
  const el = document.createElement('div');
  el.className = `bubble ${who}`;
  el.innerHTML = text ? sanitize(text) : '';
  if(img){
    const im = document.createElement('img');
    im.src = img; el.appendChild(im);
  }
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
}
function sanitize(t){ return t.replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m])); }

async function onSend(){
  const text = (msg.value||'').trim();
  if(!text && !IMAGE_DATA) return;
  addBubble('me', text, IMAGE_DATA);
  msg.value='';

  try{
    const res = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model: MODEL, 
        messages: [{role:'user', content:text}],
        imageData: IMAGE_DATA || null
      })
    });
    const data = await res.json();
    addBubble('ai', data.reply || '(хоосон хариу)');
  }catch(err){
    addBubble('ai', 'Алдаа: сервертэй холбогдсонгүй.');
  } finally {
    IMAGE_DATA = null;
    imgInput.value='';
  }
}

function fileToDataURL(file){ return new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(file); }); }

// default pane
showPane('blank');
