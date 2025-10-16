// /api/menu.js
export const config = { runtime: "edge" };

const mk5 = (p) => ([
  { id: `${p}-01`, label: "Танилцуулга" },
  { id: `${p}-02`, label: "Сургалт" },
  { id: `${p}-03`, label: "Дасгал" },
  { id: `${p}-04`, label: "Шалгалт" },
  { id: `${p}-05`, label: "Тайлан" },
]);

const MENU = [
  { id: "psychology",  label: "Сэтгэлзүй",     items: mk5("psychology") },
  { id: "health",      label: "Эрүүл мэнд",    items: mk5("health") },
  { id: "finance",     label: "Санхүү",        items: mk5("finance") },
  { id: "goals",       label: "Зорилго",       items: mk5("goals") },
  { id: "relationships", label:"Харилцаа",     items: mk5("relationships") },
  { id: "environment", label: "Орчин",         items: mk5("environment") },
  // Хэрвээ 7,8-г нэмэх бол доор нь үргэлжлүүлээд л болно.
];

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "https://chat.oyunsanaa.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  return new Response(JSON.stringify({ menu: MENU }), { status: 200, headers: cors });
}
