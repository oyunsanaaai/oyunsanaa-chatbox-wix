(()=> {
  const el = {
    input: document.querySelector('#oyInput'),
    send: document.querySelector('#btnSend'),
    stream: document.querySelector('#oyStream')
  };

  const OY_API_BASE = 'https://chat.oyunsanaa.com'; // зөвхөн шинэ домэйн

  const bubble = (text, who='bot') => {
    const d = document.createElement('div');
    d.className = who;
    d.textContent = text;
    el.stream.appendChild(d);
  };

  async function send() {
    const t = el.input.value.trim();
    if (!t) return;
    bubble(t, 'user');
    el.input.value = '';
    try {
      const r = await fetch(`${OY_API_BASE}/api/oy-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: t, history: [] })
      });
      const { reply, error } = await r.json();
      bubble(error || reply || '⚠️ алдаа', 'bot');
    } catch (e) {
      bubble('⚠️ API холболт алдаа', 'bot');
    }
  }

  el.send.addEventListener('click', send);
})();
