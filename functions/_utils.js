// functions/_utils.js
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
export const ok = (obj) =>
  new Response(JSON.stringify(obj), { headers: { ...CORS, "Content-Type":"application/json" }});
export const err = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type":"application/json" }});
export const no = (status=405, msg="Method not allowed") => err(status, { error: msg });

export async function hashPass(pw) {
  const enc = new TextEncoder().encode(pw);
  const d = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export function uuid() {
  return crypto.randomUUID();
}

// very small signed token (HMAC) stored in cookie/Authorization
export async function sign(payload, secret) {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const s = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return btoa(JSON.stringify(payload)) + "." + s;
}
export async function verify(token, secret) {
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const payload = JSON.parse(atob(p));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign", "verify"]);
  const sig = Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sig, data);
  return ok ? payload : null;
}

export function getAuth(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  return t;
}
