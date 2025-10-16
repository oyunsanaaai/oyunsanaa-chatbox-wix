// CommonJS — Vercel-д найдвартай
const fetch = globalThis.fetch;

module.exports = async function handler(req, res){
  // CORS — same-origin үед ч зөрчилгүй
  const allowList = [
    "https://chat.oyunsanaa.com",
    "https://oyunsanaa.com",
    "https://oyunsanaa-chatbox-wix.vercel.app"
  ];
  const origin = req.headers.origin || "";
  const allowOrigin = allowList.includes(origin) ? origin : allowList[0];
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if(req.method==="OPTIONS") return res.status(204).end();
  if(req.method!=="POST") return res.status(405).json({ error:"Method Not Allowed" });

  try{
    const body = typeof req.body==="string" ? JSON.parse(req.body) : (req.body||{});
    const msg   = String(body.msg||"");
    const model = String(body.model||"gpt-4o-mini").trim(); // анхдагч хурдан
    const persona = String(body.persona||"soft").trim();

    const CORE = "Чи 'Оюунсанаа' нэртэй зөөлөн, бодлоготой туслах. Богино тод, эелдэг хариул.";
    const PERSONA = persona==="wise"
      ? "Аминч биш, ухаалаг, тайван өнгө аяс баримтал."
      : persona==="parent"
      ? "Дулаан, асран хамгаалах өнгө аяс баримтал."
      : "Зөөлөн, урам өгч, чиглүүл.";

    const key = process.env.OPENAI_API_KEY;
    if(!key) return res.status(500).json({ error:"OPENAI_API_KEY алга" });

    // OpenAI Responses API (JSON)
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${key}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model,                  // "gpt-4o" эсвэл "gpt-4o-mini"
        input: [
          { role:"system", content:[{type:"text", text:`${CORE} ${PERSONA}`}] },
          { role:"user",   content:[{type:"text", text: msg}] }
        ]
      })
    });

    if(!resp.ok){
      const t = await resp.text();
      return res.status(500).json({ error:`OpenAI ${resp.status}: ${t}` });
    }
    const data = await resp.json();
    const reply = data.output_text
               || data.choices?.[0]?.message?.content
               || "(хоосон)";
    return res.status(200).json({ reply });
  }catch(e){
    return res.status(500).json({ error: String(e?.message||e) });
  }
};
