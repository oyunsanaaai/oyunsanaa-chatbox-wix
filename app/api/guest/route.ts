import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  cookies().set("oy_guest", JSON.stringify({
    qLeft: 15, minsLeft: 120, startedAt: Date.now()
  }), { httpOnly:true, sameSite:"lax", path:"/", maxAge:60*60*3 });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://chat.oyunsanaa.com";
  return NextResponse.redirect(new URL("/chat", base));
}
