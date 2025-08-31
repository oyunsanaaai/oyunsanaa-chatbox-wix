(()=> {
  if (window.__OY_BOOTED__) return; 
  window.__OY_BOOTED__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const OY_API_BASE = 'https://chat.oyunsanaa.com';

  const el = {
    overlay: $('#oyOverlay'), 
    modal: $('#oyModal'),
    drawer: $('#oyDrawer'), 
    menu: $('.oy-menu'),
    menuList: $('#menuList'),
    itemGuides: $('#itemGuides'), guidesWrap: $('#guidesWrap'),
    guideCatsAge: $('#guideCatsAge'), guideCatsSpecial: $('#guideCatsSpecial'),
    activeList: $('#activeList'),
    title: $('#chatTitle'),
    chat: $('#oyChat'), stream: $('#oyStream'),
    input: $('#oyInput'), send: $('#btnSend'),
    btnDrawer: $('#btnDrawer'), btnClose: $('#btnClose'),
    accName: $('#accName'), accCode: $('#accCode'),
    panel: $('#oyPanel'), pBack: $('#oyPanelBack'),
    pTitle: $('#oyPanelTitle'), pBody: $('#oyPanelBody'),
    file: $('#oyFile'),
    modelSelect: $('#modelSelect'),
  };

  const LSKEY='oy_state_v10'; const msgKey = k=>'oy_msgs_'+k;
  let state = { account:{name:'Хэрэглэгч', code:'OY-0000'}, current:null, active:{} };
  try { const s=JSON.parse(localStorage.getItem(LSKEY)||'null'); if(s) state={...state,...s}; } catch(_){}
  const save = () => localStorage.setItem(LSKEY, JSON.stringify(state));

  const esc = (s) =>
    String(s).replace(/[&<>"]|'/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const bubble = (html, who='bot') => {
    const d = document.createElement('div');
    d.className = 'oy-bubble ' + (who === 'user' ? 'oy-user' : 'oy-bot');
    d.innerHTML = html;
    el.stream.appendChild(d);
    if (el.chat) el.chat.scrollTop = el.chat.scrollHeight + 999;
    return d;
  };

  const meta = (t) => {
    const m = document.createElement('div');
    m.className = 'oy-meta';
    m.textContent = t;
    el.stream.appendChild(m);
  };

  function msgKey(key) {
    return 'oy_msgs_' + key;
  }

  function pushMsg(key, who, html){
    const k = msgKey(key);
    const arr = JSON.parse(localStorage.getItem(k)||'[]');
    arr.push({t:Date.now(), who, html});
    localStorage.setItem(k, JSON.stringify(arr));
  }

  async function send(){
    const t = (el.input?.value || '').trim();
    if (!t) { meta('Жишээ: "Сайн байна уу?"'); return; }
    if (!state.current) { bubble('Эхлээд Сэтгэлийн хөтөчөөс чат сонгоорой. 🌿','bot'); el.input.value=''; return; }

    bubble(esc(t),'user'); pushMsg(state.current,'user',esc(t));
    el.input.value=''; el.send.disabled=true;

    let hist=[]; try{ hist=JSON.parse(localStorage.getItem(msgKey(state.current))||'[]'); }catch(_){}

    try{
      const r = await fetch(OY_API_BASE + '/api/oy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: getSelectedModel(),
          msg: t,
          chatSlug: state.current || '',
          history: hist
        })
      });
      const {reply,error} = await r.json().catch(()=>({error:'Invalid JSON'}));
      if (error) throw new Error(error);
      const safe = esc(reply || 'Одоохондоо хариу олдсонгүй.');
      bubble(safe,'bot'); pushMsg(state.current,'bot',safe); save();
    }catch(e){
      console.error(e); bubble('⚠️ Холболтын алдаа эсвэл API тохиргоо дутуу байна.','bot');
    }finally{ el.send.disabled=false; }
  }

  function getSelectedModel() {
    const v = el.modelSelect?.value?.trim();
    return (v === 'gpt-4o' || v === 'gpt-4o-mini') ? v : 'gpt-4o-mini';
  }

  el.send?.addEventListener('click', send);
  el.input?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }});
})();
