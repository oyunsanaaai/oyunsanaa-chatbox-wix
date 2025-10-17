// oy.js — цэвэрлэсэн, нэгтгэсэн хувилбар
(() => {
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

  /* ---------- ТЕМА ---------- */
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
  renderThemePicker();

  /* ---------- Нас / гарчиг ---------- */
  const AGE_KEY = 'oy_age_choice';
  function updateTitleFromAge(){
    const saved = localStorage.getItem(AGE_KEY);
    if (el.chatTitle) el.chatTitle.textContent = saved ? ('Оюунсанаа — ' + saved) : 'Оюунсанаа — Чат';
  }
  $('#btnRegister')?.addEventListener('click', (e)=>{
    e.preventDefault();
    const form = $('#ageForm'); if(!form) return;
    const sel = form.querySelector('input[name="age"]:checked');
    if(!sel) { alert('Эхлээд насны ангилал сонгоно уу.'); return; }
    const label = sel.parentElement.textContent.trim();
    localStorage.setItem(AGE_KEY, label);
    updateTitleFromAge();
    alert('Сонголт хадгалагдлаа.');
  });
  updateTitleFromAge();

  /* ---------- Drawer ---------- */
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if(el.overlay) el.overlay.hidden = !opened;
  });
  el.overlay?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open'); if(el.overlay) el.overlay.hidden = true;
  });

  /* ---------- ЧАТ суурь ---------- */
  const OY_API = window.OY_API_BASE || "";     // ж: "https://<project>.vercel.app"
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
  (function redraw(){
    if (!el.stream) return;
    el.stream.innerHTML=''; const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ганц чат. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  })();

  function showTyping(){ if (el.typing) el.typing.hidden = false; }
  function hideTyping(){ if (el.typing) el.typing.hidden = true; }

  // файл -> dataURL (зураг илгээхэд)
  function fileToDataURL(file){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // Түүх
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';
// --- file → compressed dataURL (for API upload) ---
// --- file -> compressed dataURL (for API upload) ---
async function fileToDataURL(file, maxSide = 1024, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL('image/webp', quality);
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = reject;
    img.src = url;
  });
}
async function sendCurrent() {
  const t = (el.input?.value || "").trim();
  const files = Array.from(el.file?.files || []);
  if (!t && !files.length) return;

  // chat урсгалд хэрэглэгчийн текстийг нэг л удаа харуулна
  if (t) { bubble(t, 'user'); pushMsg('user', t); HISTORY.push({role:'user', content:t}); }

  // сервер рүү зөвхөн dataURL массив явуулна (давхар preview хийгдэхгүй)
  const dataURLs = [];
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const d = await fileToDataURL(f);
      // Хэрэглэгчид харагдах жижиг preview (нэг л удаа)
      bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`, 'user', true);
      pushMsg('user', `<img src="${d}">`, true);
      dataURLs.push(d);
    } else {
      bubble('📎 ' + f.name, 'user'); pushMsg('user', f.name);
    }
  }

  if (el.input) el.input.value = "";
  if (el.file)  el.file.value  = "";

  await callChat({ text: t, images: dataURLs });
}
  /* ---------- ЗҮҮН МЕНЮ: товч → oySend ---------- */
  // HTML дээр: onclick="oySend('mental-edu','intro')"
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text, 'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content: text });

    // Хэрэв одоо зураг сонгосон бол хамт явуулна
    const files = Array.from(el.file?.files || []);
    const images = [];
    for (const f of files) if (f.type.startsWith('image/')) images.push(await fileToDataURL(f));
    if (el.file) el.file.value = "";

    await callChat({ text, images });
  };

  /* ---------- Sidebar товч → дотоод pane нээх ---------- */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const target = Array.from(document.querySelectorAll('.oy-pane')).find(p=>p.dataset.pane===key);
      if (!target) return;
      if (!target.hidden) { target.hidden = true; return; }
      document.querySelectorAll('.oy-pane').forEach(p=>p.hidden = p!==target);
    });
  });

})();
