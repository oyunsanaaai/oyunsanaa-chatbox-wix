// api/trial-start.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const secret = process.env.JWT_SECRET;
    const hours = Number(process.env.TRIAL_HOURS || 2);
    const maxMsg = Number(process.env.TRIAL_MAX_MSG || 15);

    const expMs = Date.now() + hours * 60 * 60 * 1000;
    const jwtid = crypto.randomUUID();

    const token = jwt.sign({ role: 'trial' }, secret, { expiresIn: `${hours}h`, jwtid });

    res.setHeader('Set-Cookie', `os_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${hours * 3600}`);
    return res.status(200).json({ ok: true, token, exp: Math.floor(expMs/1000), max: maxMsg, remaining: maxMsg });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
