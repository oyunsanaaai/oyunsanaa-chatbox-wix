// api/auth-check.js
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const cookie = String(req.headers.cookie || '');
  const token = cookie.split('; ').find(s => s.startsWith('os_auth='))?.split('=')[1];
  if (!token) return res.status(200).json({ ok:false });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ ok:true, role:data.role || 'member' });
  } catch {
    return res.status(200).json({ ok:false });
  }
};
