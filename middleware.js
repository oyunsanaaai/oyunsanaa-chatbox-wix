export const config = { matcher: ['/chat'] };

export default function middleware(req) {
  const url = new URL(req.url);
  const authed = req.cookies.get('os_auth')?.value === '1';
  if (!authed) {
    url.pathname = '/';
    return Response.redirect(url);
  }
  return Response.next();
}
