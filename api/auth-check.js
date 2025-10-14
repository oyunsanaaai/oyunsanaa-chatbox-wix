// /api/auth-check.js  (CommonJS, алдаа гарсан ч 200 {ok:false} буцаана)
let jwt;
try { jwt = require('jsonwebtoken'); } catch (_) { /* dependency алга байж болно */ }

module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const cookie = String(req.headers.cookie || '');
    const token = cookie.split('; ').find(s => s.startsWith('os_auth='))?.split('=')[1];
    const secret = process.env.JWT_SECRET || '';

    if (!token || !secret || !jwt) {
      // токен/secret эсвэл jsonwebtoken байхгүй бол OK=false
      return res.status(200).json({ ok: false });
    }

    try { jwt.verify(token, secret); return res.status(200).json({ ok: true }); }
    catch { return res.status(200).json({ ok: false }); }
  } catch {
    return res.status(200).json({ ok: false });
  }
};
