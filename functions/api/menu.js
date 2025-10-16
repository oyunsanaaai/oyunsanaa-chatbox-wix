import { ok, no } from "../_utils.js";
export async function onRequestGet() {
  const groups = [
    { id:"psychology", title:"Сэтгэлзүй" },
    { id:"health",     title:"Эрүүл мэнд" },
    { id:"finance",    title:"Санхүү" },
    { id:"goals",      title:"Зорилго" },
    { id:"relations",  title:"Харилцаа" },
    { id:"environment",title:"Орчин" }
  ];
  return ok({ groups });
}
export const onRequestOptions = () => new Response(null, { status:204 });
export const onRequestPost = () => no();
