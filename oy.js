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

  const model = (q.length>220) ? "gpt-4o" : "gpt-4o-mini"; // урт бол гүн, бусад нь хурдан
  try{
    const r = await fetch(API, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ msg:q, model, persona:"soft" })
    });
    if(!r.ok){ add("Сервер", `Алдаа: ${r.status}`); return; }
    const j = await r.json();
    add("Оюунсанаа", j.reply || "(хоосон)");
  }catch(err){
    add("Сервер", "Холболтын алдаа (API эсвэл сүлжээ).");
    console.error(err);
  }
});
