import { NextResponse } from "next/server";

/**
 * Wix-ийн Button/Webhook-оос:
 *   fetch("https://chat.oyunsanaa.com/api/wix/link", {
 *     method:"POST",
 *     headers: { "X-WIX-SECRET": "<config дээрх нууц>" },
 *     body: JSON.stringify({ email, name })
 *   })
 */
export async function POST(req: Request) {
  const hdr = req.headers.get("X-WIX-SECRET") || "";
  if (hdr !== (process.env.WIX_SECRET || "")) {
    return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });
  }
  const { email, name } = await req.json();
  // Эндээс шууд /api/auth/login руу дамжуулж болно (internal call)
  const url = new URL(req.url);
  url.pathname = "/api/auth/login";
  const r = await fetch(url, { method:"POST", body: JSON.stringify({ email, name }) });
  const res = NextResponse.json({ ok:true });
  // login route cookie-г тавьсан тул энд зүгээр OK буцаана
  (await r.json());
  return res;
}
