// /api/ping.ts
export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(JSON.stringify({ ok:true, ts: Date.now() }), { headers:{'Content-Type':'application/json'} });
}
