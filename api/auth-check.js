// /api/auth-check.js  (CommonJS, алдаа унахаар 200 {ok:false} буцаана)
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const secret = process.env.JWT_SECRET || '';
    if (!secret) return res.status(200).json({ ok: false });

    const cookie = String(req.headers.cookie || '');
    const token = cookie.split('; ').find(s => s.startsWith('os_auth='))?.split('=')[1];
    if (!token) return res.status(200).json({ ok: false });

    try {
      jwt.verify(token, secret);
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: false });
    }
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
};
