(() => {
  if (window.__OY_BOOTED__) return;
  window.__OY_BOOTED__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const OY_API_BASE = 'https://chat.oyunsanaa.com';

  const el = {};
  const state = { current: null };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceOpen);
  } else {
    forceOpen();
  }

  function forceOpen() {
    el.stream = $('#oyStream');
    el.input = $('#oyInput');
    el.send = $('#oySend');
    el.modelSelect = $('#oyModel');

    el.send?.addEventListener('click', send);
    el.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  function bubble(text, who = 'bot') {
    if (!el.stream) return;
    const div = document.createElement('div');
    div.className = `oy-bubble ${who}`;
    div.innerText = text;
    el.stream.appendChild(div);
    el.stream.scrollTop = el.stream.scrollHeight;
  }

  function esc(str) {
    return (str || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));
  }

  function msgKey(slug) {
    return `oy-msg-${slug}`;
  }

  function pushMsg(slug, who, html) {
    const key = msgKey(slug);
    let arr = [];
    try {
      arr = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {}
    arr.push({ who, html });
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function save() {
    // future expansion
  }

  async function send() {
    const t = (el.input?.value || '').trim();
    if (!t) {
      meta('Жишээ: "Сайн байна уу?"');
      return;
    }
    if (!state.current) {
      bubble('Эхлээд Сэтгэлийн хөтөчөөс чат сонгоорой. 🌿', 'bot');
      el.input.value = '';
      return;
    }

    bubble(esc(t), 'user');
    pushMsg(state.current, 'user', esc(t));
    el.input.value = '';
    el.send.disabled = true;

    let hist = [];
    try {
      hist = JSON.parse(localStorage.getItem(msgKey(state.current)) || '[]');
    } catch (_) {}

    try {
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
      const { reply, error } = await r.json().catch(() => ({ error: 'Invalid JSON' }));
      if (error) throw new Error(error);
      const safe = esc(reply || 'Одоохондоо хариу олдсонгүй.');
      bubble(safe, 'bot');
      pushMsg(state.current, 'bot', safe);
      save();
    } catch (e) {
      console.error(e);
      bubble('⚠️ Холболтын алдаа эсвэл API тохиргоо дутуу байна.', 'bot');
    } finally {
      el.send.disabled = false;
    }
  }

  function getSelectedModel() {
    const v = el.modelSelect?.value?.trim();
    return v === 'gpt-4o' || v === 'gpt-4o-mini' ? v : 'gpt-4o-mini';
  }

  function meta(msg) {
    bubble(msg, 'bot');
  }
})();
