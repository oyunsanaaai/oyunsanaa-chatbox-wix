// api/menu.js
export const config = { runtime: "edge" };

const MENU = [
  { id:"psychology",   label:"Сэтгэлзүй",      buttons:["Танилцуулга","Тест","Өдөр тутам","Дасгал","Нөөц"] },
  { id:"health",       label:"Эрүүл мэнд",     buttons:["Танилцуулга","Төлөвлөгөө","Хоол/Дасгал","Амралт","Нөөц"] },
  { id:"finance",      label:"Санхүү",         buttons:["Танилцуулга","Орлого/Зарлага","Төсөв","Зорилт","Нөөц"] },
  { id:"goals",        label:"Зорилго",        buttons:["Танилцуулга","SMART","7 хоног","30 хоног","Нөөц"] },
  { id:"relationships",label:"Харилцаа",       buttons:["Танилцуулга","Ур чадвар","Зөрчил шийдэл","Гэр бүл","Нөөц"] },
  { id:"environment",  label:"Орчин",          buttons:["Танилцуулга","Дадал","Ажлын орчин","Амьдрах орчин","Нөөц"] },
  { id:"reminders",    label:"Сануулга",       buttons:["Танилцуулга","Өдөр бүр","Долоо хоног","Тусгай","Нөөц"] },
  { id:"journal",      label:"Тэмдэглэл",      buttons:["Танилцуулга","Өдрийн тэмдэглэл","Баярлалаа","Ойлголт","Нөөц"] },
];

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "https://chat.oyunsanaa.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  if (req.method === "OPTIONS") return new Response(null, { status:200, headers:cors });
  if (req.method !== "GET")
    return new Response(JSON.stringify({ error:"Method not allowed" }), { status:405, headers:cors });

  return new Response(JSON.stringify({ menu: MENU }), { status:200, headers:cors });
}
