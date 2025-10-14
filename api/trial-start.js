// api/trial-start.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function makeToken(hours) {
  const secret = process.env.JWT_SECRET;
  const jwtid = crypto.randomUUID();
  return jwt.sign({ role: 'trial' }, secret, { expiresIn: `${hours}h`, jwtid });
}

module.exports = async function handler(req, res) {
  const hours = Number(process.env.TRIAL_HOURS || 2);

  // аль домэйноос ч ирсэн бай Set-Cookie зөв буухын тулд зөв origin тавина
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const token = makeToken(hours);
    // ЧАТ домэйн дээр хүчинтэй cookie
    res.setHeader('Set-Cookie', `os_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${hours * 3600}`);

    // GET бол шууд redirect (site-ээс орохдоо энэ замаар ирнэ)
    if (req.method === 'GET') {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const redirect = url.searchParams.get('redirect') || '/chat';
      res.writeHead(302, { Location: redirect });
      return res.end();
    }

    // POST (хэрэв AJAX-аар дуудах бол)
    return res.status(200).json({ ok: true, hours });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
