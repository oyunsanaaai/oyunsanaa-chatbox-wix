export const config = { matcher: ['/chat'] };

export default function middleware(req) {
  const token = req.cookies.get('os_auth')?.value;
  if (!token) {
    const url = new URL('/', req.url);
    return Response.redirect(url);
  }
  return Response.next();
}
