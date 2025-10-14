// api/logout.js
module.exports = async function handler(req, res) {
  res.setHeader('Set-Cookie', 'os_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  res.writeHead(302, { Location: '/' });
  res.end();
};
