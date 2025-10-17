(()=> {
  if (window.__OY_BOOTED__) return;  // дахин ачаалтад давхар бүү ажилла
  window.__OY_BOOTED__ = true;

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
    chatTitle: $('#chatTitle'),
  };

  /* ---------- Themes ---------- */
  const THEMES = [
    {name:'Blue',  grad:['#0d1726','#1d2740']},
    {name:'Green', grad:['#081a16','#12322b']},
    {name:'Gold',  grad:['#1b140b','#332515']},
    {name:'Gray',  grad:['#0f1114','#191b22']},
    {name:'Teal',  grad:['#0a2021','#143638']},
  ];
  const THEME_KEY = 'oy_theme_idx_v1';
  function applyTheme(i){ document.documentElement.setAttribute('data-t', i); }

  (function renderThemePicker(){
    if (!el.themePicker) return;
    el.themePicker.innerHTML = '';
    THEMES.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'oy-swatch';
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})"></i>`;
      b.title = t.name;
      b.addEventListener('click', ()=>{
        localStorage.setItem(THEME_KEY, String(i));
        applyTheme(i);
      });
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  /* ---------- Drawer (single bind) ---------- */
  function bindOnce(target, evt, fn) {
    if (!target) return;
    target.__oybind = target.__oybind || {};
    const old = target.__oybind[evt];
    if (old) target.removeEventListener(evt, old);
    target.addEventListener(evt, fn);
    target.__oybind[evt] = fn;
  }

  bindOnce(el.btnDrawer, 'click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = !opened;
  });

  bindOnce(el.overlay, 'click', ()=>{
    document.body.classList.remove('oy-drawer-open');
    if (el.overlay) el.overlay.hidden = true;
  });

  /* ---------- Helpers ---------- */
  const OY_API = window.OY_API_BASE || "";
  const MSGKEY = 'oy_msgs_one';

  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };

  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom(); return d;
  }
  function meta(t){
    const m = document.createElement('div');
    m.className='oy-meta'; m.textContent=t;
    el.stream.appendChild(m); scrollBottom();
  }

  function loadMsgs(){ try{ return JSON.parse(localStorage.getItem(MSGKEY)||'[]'); }catch(_){ return []; } }
  function pushMsg(who, html, isHTML=false){
    // localStorage-д том DataURL хадгалахгүй
    const MAX = 2000; let store = html;
    if (isHTML && /<img\s/i.test(html)) store = "[image]";
    else if (String(html).length > MAX) store = String(html).slice(0, MAX) + "…";
    try{
      const arr = loadMsgs(); arr.push({ t: Date.now(), who, html: store, isHTML:false });
      localStorage.setItem(MSGKEY, JSON.stringify(arr.slice(-50)));
    }catch(e){
      try{
        const arr = loadMsgs().slice(-20);
        localStorage.setItem(MSGKEY, JSON.stringify(arr));
      }catch(_){}
    }
  }

  (function redraw(){
    if (!el.stream) return;
    el.stream.innerHTML=''; const arr = loadMsgs();
    if (!arr.length){ bubble('Сайн уу! Оюунсанаатай ярилцъя. 🌿','bot'); meta('Тавтай морилно уу'); }
    else { arr.forEach(m => bubble(m.html, m.who, m.isHTML)); }
  })();

  function showTyping(){
    if (!el.typing) return;
    el.typing.style.display = 'flex';
    clearTimeout(window.__oyTypingTimer);
    window.__oyTypingTimer = setTimeout(()=>{ el.typing.style.display='none'; }, 1600);
  }
  function hideTyping(){ if (el.typing) el.typing.style.display='none'; }

 // Файлыг canvas-аар багасгаад JPEG/WebP dataURL болгож буцаана
async function fileToDataURL(file, { maxSide = 1280, quality = 0.75 } = {}) {
  // зураг унших
  const blobUrl = URL.createObjectURL(file);
  let bmp, imgW, imgH;
  try {
    // хурдан, бага санах ой: createImageBitmap
    bmp = await createImageBitmap(file);
    imgW = bmp.width; imgH = bmp.height;
  } catch {
    // fallback
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = blobUrl;
    });
    imgW = img.width; imgH = img.height;
    bmp = img; // drawImage-д шууд ашиглая
  }

  // хэмжээг бууруулах
  const scale = Math.min(1, maxSide / Math.max(imgW, imgH));
  const w = Math.round(imgW * scale);
  const h = Math.round(imgH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(bmp, 0, 0, w, h);

  // webp → амжилтгүй бол jpeg
  let out = canvas.toDataURL('image/webp', quality);
  if (out.length < 16) out = canvas.toDataURL('image/jpeg', quality);

  try { URL.revokeObjectURL(blobUrl); } catch {}
  return out;
}

  // preview chips (NEVER auto-send)
  let previewImages = []; // dataURL array
  function renderPreviews(){
    if (!el.previews) return;
    if (!previewImages.length){ el.previews.hidden = true; el.previews.innerHTML=''; return; }
    el.previews.hidden = false;
    el.previews.innerHTML = previewImages.map((d,i)=>(
      `<div class="oy-chip"><img src="${d}" alt=""><button data-i="${i}">×</button></div>`
    )).join('');
    el.previews.querySelectorAll('button').forEach(btn=>{
      btn.onclick = () => { const i = +btn.dataset.i; previewImages.splice(i,1); renderPreviews(); };
    });
  }
function extractReply(j) {
  if (Array.isArray(j?.output)) {
    const chunks = [];
    for (const m of j.output) {
      for (const c of (m?.content || [])) {
        if ((c?.type === "text" || c?.type === "output_text" || c?.type === "input_text") && typeof c.text === "string") {
          chunks.push(c.text);
        } else if (typeof c === "string") chunks.push(c);
      }
    }
    if (chunks.length) return chunks.join("");
  }
  if (j?.message?.content) {
    const t = (j.message.content || []).map(c => (typeof c === "string" ? c : (c?.text || ""))).join("");
    if (t) return t;
  }
  if (j?.choices?.[0]?.message?.content) return j.choices[0].message.content;
  if (typeof j?.text === "string") return j.text;
  if (typeof j?.reply === "string") return j.reply;
  return "";
}
  /* ---------- State ---------- */
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';

let SENDING = false;

async function callChat({ text = "", images = [] }) {
  if (!OY_API) { bubble("⚠️ API тохируулга хийгдээгүй (window.OY_API_BASE).", "bot"); return; }
  if (SENDING) return;
  SENDING = true;
  showTyping();

  try {
    const USER_LANG = (window.OY_LANG || navigator.language || "mn").split("-")[0] || "mn";
    const payload = { moduleId: CURRENT_MODULE, text, images, chatHistory: HISTORY, userLang: USER_LANG };
    const endpoints = [`${OY_API}/v1/chat`, `${OY_API}/api/chat`, `${OY_API}/chat`];

    let reply = "", lastErr = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok && (res.status === 404 || res.status === 405)) continue;

        const ct = (res.headers.get("content-type") || "").toLowerCase();

        if (ct.includes("text/event-stream") && res.body) {
          // STREAM
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let acc = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const dataStr = t.slice(5).trim();
              if (dataStr === "[DONE]") break;
              try {
                const evt = JSON.parse(dataStr);
                const piece = evt?.delta?.text ?? extractReply(evt) ?? "";
                if (piece) acc += piece;
              } catch {}
            }
          }
          reply = acc.trim();
        } else {
          // JSON
          const j = await res.json();
          reply = (extractReply(j) || "").trim();
        }

        if (reply) break; // амжилттай авсан бол зогсоно
      } catch (e) { lastErr = e; }
    }

    if (!reply) {
      if (lastErr) console.error(lastErr);
      reply = "⚠️ Хариу формат ойлгогдсонгүй. Backend-ийн JSON-д content[].type='text' (эсвэл 'output_text') байгаа эсэхээ шалгаарай.";
    }

    bubble(reply, "bot");
    pushMsg("bot", reply);
    HISTORY.push({ role: "assistant", content: reply });
  } catch (e) {
    console.error(e);
    bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалга.", "bot");
  } finally {
    hideTyping();
    SENDING = false;
  }
}


  async function sendCurrent(){
    const t = (el.input?.value || "").trim();
    if (!t && !previewImages.length) return;

    if (t) { bubble(t,'user'); pushMsg('user', t); HISTORY.push({ role:'user', content: t }); }
    const imgs = [...previewImages];
    if (imgs.length){
      imgs.forEach(d=>{
        bubble(`<div class="oy-imgwrap"><img src="${d}" alt=""></div>`,'user',true);
        pushMsg('user', `<img src="${d}">`, true);
      });
    }
    el.input.value = ""; previewImages = []; renderPreviews();
    await callChat({ text: t, images: imgs });
  }

  bindOnce(el.send, 'click', sendCurrent);
  bindOnce(el.input, 'keydown', (e)=>{
    if (e.key==='Enter' && !e.shiftKey){
      e.preventDefault(); sendCurrent();
    }
  });

  bindOnce(el.file, 'change', async (e)=>{
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  for (const f of files){
    if (!f.type.startsWith('image/')) continue;

    const durl = await fileToDataURL(f, { maxSide: 1280, quality: 0.75 });

    // ~байтын ойролцоо тооцоолол
    const base64 = (durl.split(',')[1]||"");
    const bytes = Math.floor(base64.length * 3 / 4);

    if (bytes > 1.2 * 1024 * 1024) { // > ~1.2MB бол хая
      bubble("⚠️ Зураг хэт том байна. Бага хэмжээтэй зураг сонгоорой.", "bot");
      continue;
    }

    previewImages.push(durl);
  }

  e.target.value = "";
  renderPreviews();
  el.input?.focus();
});

  /* ---------- Menu open/close ---------- */
  document.querySelectorAll('.oy-item[data-menu]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.menu;
      const target = Array.from(document.querySelectorAll('.oy-pane')).find(p=>p.dataset.pane===key);
      if (!target) return;
      if (!target.hidden) { target.hidden = true; return; }
      document.querySelectorAll('.oy-pane').forEach(p=>p.hidden = p!==target);
    });
  });

  /* ---------- Public API for menu buttons ---------- */
  window.oySend = async function(moduleId, action){
    CURRENT_MODULE = moduleId || CURRENT_MODULE;
    const text = `User selected: ${moduleId} / ${action}`;
    bubble(text,'user'); pushMsg('user', text);
    HISTORY.push({ role:'user', content: text });
    const imgs = [...previewImages]; previewImages = []; renderPreviews();
    await callChat({ text, images: imgs });
  };

})();
