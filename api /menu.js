// api/menu.js — Vercel Edge Function
export const config = { runtime: "edge" };

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "https://chat.oyunsanaa.com");
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
}

const MENU = [
  { id: "psychology",  label: "Сэтгэлзүй",
    buttons: ["Танилцуулга","Тест","Өдөр тутам","Дасгал","Нөөц"] },
  { id: "health",      label: "Эрүүл мэнд",
    buttons: ["Танилцуулга","Төлөвлөгөө","Хоол/Дасгал","Амралт","Нөөц"] },
  { id: "finance",     label: "Санхүү",
    buttons: ["Танилцуулга","Орлого/Зарлага","Төсөв","Зорилт","Нөөц"] },
  { id: "goals",       label: "Зорилго",
    buttons: ["Танилцуулга","SMART","7 хоног","30 хоног","Нөөц"] },
  { id: "relationships", label: "Харилцаа",
    buttons: ["Танилцуулга","Харилц.ур чадвар","Зөрчил шийдэл","Гэр бүл","Нөөц"] },
  { id: "environment", label: "Орчин",
    buttons: ["Танилцуулга","Дадал","Ажлын орчин","Амьдрах орчин","Нөөц"] },
  { id: "reminders",   label: "Сануулга",
    buttons: ["Танилцуулга","Өдөр бүр","Долоо хоног","Тусгай","Нөөц"] },
  { id: "journal",     label: "Тэмдэглэл",
    buttons: ["Танилцуулга","Өдрийн тэмдэглэл","Баярлалаа","Ойлголт","Нөөц"] },
];

export default async function handler(req) {
  const res = new Response(null, { status: 200, headers: new Headers() });
  cors(res);
  if (req.method === "OPTIONS") return res;
  if (req.method !== "GET")
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: res.headers
    });

  return new Response(JSON.stringify({ menu: MENU }), {
    status: 200,
    headers: res.headers
  });
}
