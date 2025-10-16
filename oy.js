// SAME-ORIGIN: host солигдсон ч ажиллана
const API = "/api/oy-chat";

const $ = (s)=>document.querySelector(s);
const log = $("#log"), form = $("#chatForm"), input = $("#oyInput");

function add(who, text){
  const d = document.createElement("div");
  d.className = "msg";
  d.innerHTML = `<b>${who}:</b> ${escape(text)}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}
const escape = s => (s||"").replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const q = (input.value||"").trim();
  if(!q) return;

  add("Та", q);
  input.value = "";

  // хуучин: const API_BASE = "https://api-.....vercel.app";
const API_BASE = ""; // same-origin -> chat.oyunsanaa.com
const r = await fetch(`${API_BASE}/api/oy-chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: t.length >= 220 ? "gpt-4o" : "gpt-4o-mini",
    persona: "soft",
    msg: t,
    chatSlug: "one-chat",
    history
  })
});
