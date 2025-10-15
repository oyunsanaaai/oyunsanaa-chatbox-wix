// middleware.ts (root)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  "/api/guest",      // зочин нээх
  "/preview",        // Wix preview
  "/favicon.ico",
  "/_next",          // Next static
  "/assets",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Public resource-ууд
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const hasUser  = req.cookies.get("oy_user");
  const hasGuest = req.cookies.get("oy_guest");

  // Нэвтэрсэн юмуу зочин-cookie байгаа бол нэвтрүүл
  if (hasUser || hasGuest) return NextResponse.next();

  // Үгүй бол login/landing руу (эсвэл шууд guest гарц руу) шилжүүл
  const url = req.nextUrl.clone();
  url.pathname = "/login"; // хүсвэл "/api/guest" болгож зочин горимоор шууд оруулж болно
  return NextResponse.redirect(url);
}
