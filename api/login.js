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
