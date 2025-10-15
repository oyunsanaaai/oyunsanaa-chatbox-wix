import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ts  = searchParams.get("ts") || "";
  const sig = searchParams.get("sig") || "";
  const fresh = Math.abs(Date.now() - Number(ts)) < 5 * 60 * 1000;
  const expected = crypto.createHmac("sha256", process.env.WIX_SECRET || "").update(ts).digest("hex");
  if (!fresh || sig !== expected) return NextResponse.json({ ok:false }, { status:403 });

  cookies().set("oy_preview", "1", { httpOnly:true, sameSite:"lax", path:"/", maxAge: 2*60*60 }); // 2 цаг
  return NextResponse.redirect(new URL("/chat", process.env.NEXT_PUBLIC_BASE_URL || "https://chat.oyunsanaa.com"));
}
