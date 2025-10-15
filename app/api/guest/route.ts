// app/api/guest/route.js
export async function GET() {
  const target =
    process.env.WIX_GUEST_URL || "https://oyunsanaa.com/yariltsya"; // хүсвэл солих
  return Response.redirect(target, 307);
}
