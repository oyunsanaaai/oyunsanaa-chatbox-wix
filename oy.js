// =============================
// oy.js  — TEXT-only baseline
// =============================
(() => {
  if (window.__OY_BOOTED__) return;
  window.__OY_BOOTED__ = true;

  // ---------- DOM ----------
  const $ = (s, r=document) => r.querySelector(s);
  const el = {
    overlay:   $('#oyOverlay'),
    drawer:    $('#oyDrawer'),
    btnDrawer: $('#btnDrawer'),
    stream:    $('#oyStream'),
    input:     $('#oyInput'),
    send:      $('#btnSend'),
    typing:    $('#typing'),
    themePicker: $('#themePicker'),
  };

  // ---------- API ----------
  const API_BASE = (window.OY_API_BASE || "").replace(/\/+$/,"");
  const CHAT_URL = API_BASE ? `${API_BASE}/v1/chat` : "";

  // ---------- Theme ----------
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
      const b=document.createElement('button');
      b.className='oy-swatch';
      b.innerHTML=`<i style="background:linear-gradient(135deg,${t.grad[0]},${t.grad[1]})"></i>`;
      b.title=t.name;
      b.addEventListener('click', ()=>{ localStorage.setItem(THEME_KEY, String(i)); applyTheme(i); });
      el.themePicker.appendChild(b);
    });
    applyTheme(+localStorage.getItem(THEME_KEY)||0);
  })();

  // ---------- Drawer ----------
  el.btnDrawer?.addEventListener('click', ()=>{
    const opened = document.body.classList.toggle('oy-drawer-open');
    $('#oyOverlay')?.toggleAttribute('hidden', !opened);
  });
  $('#oyOverlay')?.addEventListener('click', ()=>{
    document.body.classList.remove('oy-drawer-open');
    $('#oyOverlay')?.setAttribute('hidden','');
  });

  // ---------- Chat helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const scrollBottom = () => { el.stream.scrollTop = el.stream.scrollHeight + 999; };
  function bubble(html, who='bot', isHTML=false){
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who==='user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = isHTML ? html : esc(html);
    el.stream.appendChild(d); scrollBottom();
  }
  function showTyping(){ el.typing && (el.typing.style.display='flex'); }
  function hideTyping(){ el.typing && (el.typing.style.display='none'); }

  // ---------- State ----------
  let HISTORY = [];
  let CURRENT_MODULE = 'psychology';

  // JSON -> reply text (олон формат дэмжинэ)
  function pickReply(j){
  return (
    j?.reply ??
    j?.message ??
    j?.choices?.[0]?.message?.content ??
    j?.output?.[0]?.content?.find?.(c => c.type === "output_text")?.text ??
    j?.content ??
    ""
  );
}
async function callChat({ text = "", images = [] } = {}){
  if (!CHAT_URL){
    bubble("⚠️ API тохируулаагүй байна (OY_API_BASE).", "bot");
    return;
  }
  showTyping();
  try {
    const USER_LANG = (window.OY_LANG || navigator.language || "mn").split("-")[0];
    const r = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: CURRENT_MODULE,
        text,
        images,
        chatHistory: HISTORY,
        userLang: USER_LANG
      })
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const reply = pickReply(data).trim();

    if (!reply){
      bubble("… (хоосон хариу ирлээ)", "bot");
    } else {
      bubble(reply, "bot");
      HISTORY.push({ role: "assistant", content: reply });
    }
    if (data?.model) bubble(`🧠 Model: ${data.model}`, "bot");
  } catch(e){
    console.error(e);
    bubble("⚠️ Холболт амжилтгүй. Сүлжээ эсвэл API-г шалгана уу.", "bot");
  } finally {
    hideTyping();
  }
}
async function sendCurrent(){
  const t = (el.input?.value || "").trim();
  if (!t) return;
  bubble(t, "user");
  HISTORY.push({ role:"user", content:t });
  el.input.value = "";
  await callChat({ text:t });
}

el.send && (el.send.onclick = sendCurrent);
el.input?.addEventListener("keydown", e=>{
  if (e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendCurrent(); }
});
})();
