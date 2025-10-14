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
