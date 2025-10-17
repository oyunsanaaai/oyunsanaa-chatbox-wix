// oy.js – simplified working version
(() => {
  const OY_API = "https://oyunsanaa-api.oyunsanaa-ai.workers.dev/v1/chat";
  const $ = (s, r=document)=>r.querySelector(s);
  const el = {
    stream: $("#oyStream"),
    input: $("#oyInput"),
    file: $("#oyFile"),
    send: $("#oySend"),
    typing: $("#typing")
  };

  function bubble(text, who='bot') {
    const d = document.createElement('div');
    d.className = `oy-bubble oy-${who}`;
    d.innerHTML = text;
    el.stream.appendChild(d);
    el.stream.scrollTop = el.stream.scrollHeight;
  }

  async function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function callChat({ text="", images=[] }) {
    el.typing.hidden = false;
    try {
      const res = await fetch(OY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images })
      });
      const data = await res.json();
      const reply = data?.output?.[0]?.content?.[0]?.text || "-";
      bubble(reply, 'bot');
    } catch (err) {
      bubble("⚠️ Холболт амжилтгүй байна.", 'bot');
      console.error(err);
    } finally {
      el.typing.hidden = true;
    }
  }

  async function sendCurrent() {
    const text = el.input.value.trim();
    const files = Array.from(el.file.files || []);
    if (!text && !files.length) return;
    bubble(text, 'user');
    el.input.value = "";
    const images = [];
    for (const f of files) {
      if (f.type.startsWith("image/")) images.push(await fileToDataURL(f));
    }
    await callChat({ text, images });
  }

  el.send.addEventListener("click", sendCurrent);
  el.input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrent();
    }
  });
})();
