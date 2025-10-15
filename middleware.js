import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/login" || p.startsWith("/_next") || p === "/favicon.ico" || p.startsWith("/api/preview")) {
    return NextResponse.next();
  }
  const ok = req.cookies.get("oy_user")?.value || req.cookies.get("oy_preview")?.value === "1";
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone(); url.pathname = "/login";
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!.*\\.).*)"] };
