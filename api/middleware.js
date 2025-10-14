import jwt from 'jsonwebtoken';
export const config = { matcher: ['/chat'] };
export default function middleware(req) {
  const cookie = req.cookies.get('os_auth')?.value;
  try { jwt.verify(cookie, process.env.JWT_SECRET); return Response.next(); }
  catch { const u = new URL(req.url); u.pathname='/'; return Response.redirect(u); }
}
