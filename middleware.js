import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Нээлттэй замууд
  if (
    pathname.startsWith("/preview") ||
    pathname.startsWith("/api/guest") ||
    pathname.startsWith("/api/wix") ||     // Wix webhook/link
    pathname.startsWith("/api/health") ||  // healthcheck (доор бий)
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname === "/"
  ) return NextResponse.next();

  // Cookie шалгана
  const hasUser  = req.cookies.get("oy_user");
  const hasGuest = req.cookies.get("oy_guest");
  if (hasUser || hasGuest) return NextResponse.next();

  // Нэвтрэх руу
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
