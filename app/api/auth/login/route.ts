import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = (body?.email || "").toString().toLowerCase();
  const name  = (body?.name  || "User").toString();

  if (!email) return NextResponse.json({ ok:false, error:"EMAIL_REQUIRED" }, { status:400 });

  const token = sign({ sub: email, name }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
  const res = NextResponse.json({ ok:true });

  res.cookies.set("oy_user", token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60*60*24*7
  });

  // guest cookie байвал цэвэрлэе
  res.cookies.set("oy_guest", "", { path:"/", maxAge:0 });
  return res;
}
