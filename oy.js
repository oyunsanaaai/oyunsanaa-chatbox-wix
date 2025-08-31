// /oy.js — хамгийн бага фронт код
const $ = s => document.querySelector(s);
const stream = $('#stream');
const input = $('#msg');
const btn = $('#send');
const modelSel = $('#model'); // сонголт (байхгүй бол 4o-mini)

function line(text, who='bot') {
  const div = document.createElement('div');
  div.className = who;
  div.textContent = text;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight + 999;
}

function getModel() {
  const v = modelSel?.value?.trim();
  return (v === 'gpt-4o' || v === 'gpt-4o-mini') ? v : 'gpt-4o-mini';
}

async function send() {
  const msg = (input.value || '').trim();
  if (!msg) return;
  line(msg, 'user');
  input.value = '';
  btn.disabled = true;

  try {
    const r = await fetch('/api/oy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: getModel(), msg, history: [] })
    });
    const data = await r.json();
    if (data?.error) throw new Error(data.error);
    line(data?.reply || 'Хариу олдсонгүй', 'bot');
  } catch (e) {
    line('⚠️ API алдаа: ' + e.message, 'bot');
  } finally {
    btn.disabled = false;
  }
}

btn?.addEventListener('click', send);
input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }});
