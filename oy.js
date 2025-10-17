// === 1) Server reply-оос текстийг олж авах ганц газар ===
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

// === 2) API дуудах (TEXT ONLY, тогтвортой суурь) ===
async function callChat({ text="" } = {}){
  const CHAT_URL = (window.OY_API_BASE || "") + "/v1/chat";
  if (!window.OY_API_BASE){
    bubble("⚠️ API тохируулаагүй байна (OY_API_BASE).", "bot");
    return;
  }

  showTyping();
  try {
    const USER_LANG = (window.OY_LANG || navigator.language || "mn").split("-")[0];
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: (window.CURRENT_MODULE || "psychology"),
        text,
        images: [],                // суурь хувилбар: зураг илгээхгүй
        chatHistory: (window.HISTORY || []),
        userLang: USER_LANG
      })
    });

    if (!res.ok) throw new Error(await res.text());
    const data  = await res.json();

    // Debug-д: сүлжээ/серверийн хариуг харахад
    console.log("[/v1/chat] data =", data);

    const reply = (pickReply(data) || "").trim();
    if (!reply){
      bubble("… (хоосон хариу ирлээ)", "bot");
    }else{
      bubble(reply, "bot");
      (window.HISTORY ||= []).push({ role:"assistant", content: reply });
    }

    if (data?.model) bubble(`🧠 Model: ${data.model}`, "bot");
  } catch(err){
    console.error(err);
    bubble("⚠️ Алдаа: сүлжээ эсвэл API-г шалгана уу.", "bot");
  } finally {
    hideTyping();
  }
}

// === 3) Илгээх товч/Enter ===
async function sendCurrent(){
  const t = (el.input?.value || "").trim();
  if (!t) return;
  bubble(t, "user");
  (window.HISTORY ||= []).push({ role:"user", content:t });
  el.input.value = "";
  await callChat({ text:t });
}
el.send && (el.send.onclick = sendCurrent);
el.input?.addEventListener("keydown", e=>{
  if (e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendCurrent(); }
});
