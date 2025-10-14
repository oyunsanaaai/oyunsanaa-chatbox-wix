// api/issue-code.js  (Vercel)
import { kv } from '@vercel/kv';
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-WIX-SECRET');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.headers['x-wix-secret'] !== process.env.WIX_SECRET) return res.status(403).json({error:'Forbidden'});
  const { email, wixUserId, plan } = req.body || {};
  if(!email) return res.status(400).json({error:'email required'});
  const code = Math.random().toString(36).slice(2,10).toUpperCase();
  await kv.set(`member:${email}`, { code, wixUserId, plan, created:Date.now() });
  return res.status(200).json({ code });
};

// api/login.js  (Vercel)
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const { email, code } = req.body || {};
  const record = await kv.get(`member:${email}`);
  if(!record || record.code !== code) return res.status(401).json({error:'INVALID'});
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn:'30d' });
  res.setHeader('Set-Cookie', `os_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*30}`);
  return res.status(200).json({ ok:true });
};

// api/auth.js  (Vercel)
import jwt from 'jsonwebtoken';
module.exports = async function handler(req, res) {
  const { token } = req.query;
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    res.setHeader('Set-Cookie', `os_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*30}`);
    res.writeHead(302, { Location: '/chat' });
    res.end();
  } catch {
    res.writeHead(302, { Location: '/' });
    res.end();
  }
};

// middleware.js (Vercel)
import jwt from 'jsonwebtoken';
export const config = { matcher: ['/chat'] };
export default function middleware(req) {
  const cookie = req.cookies.get('os_auth')?.value;
  try { jwt.verify(cookie, process.env.JWT_SECRET); return Response.next(); }
  catch { const u = new URL(req.url); u.pathname='/'; return Response.redirect(u); }
}

// Wix backend (velo.js)
import { fetch } from 'wix-fetch';
export async function createMemberCode(email, wixUserId, plan) {
  const r = await fetch('https://chat.oyunsanaa.com/api/issue-code', {
    method:'POST',
    headers:{'Content-Type':'application/json','X-WIX-SECRET':process.env.WIX_SECRET},
    body:JSON.stringify({ email, wixUserId, plan })
  });
  return await r.json();
}
export async function onPlanPurchased(event) {
  const { email, userId, planId } = event;
  const res = await createMemberCode(email, userId, planId);
  const code = res.code;
  // send email or show on screen
}

// Wix "Ярилцъя" товч
// link: https://chat.oyunsanaa.com/auth?token=<signed_jwt_from_wix>

// .env (Vercel)
OPENAI_API_KEY=sk-***
JWT_SECRET=your_jwt_secret
WIX_SECRET=shared_secret_between_wix_and_vercel
