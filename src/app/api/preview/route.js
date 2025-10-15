// src/app/api/preview/route.js
export async function GET() {
  // preview дээр дарахад шууд чатын зочин горим руу оруулна
  return new Response(null, {
    status: 307,
    headers: { Location: '/guest' } // танай зочин/preview нээдэг хуудас
  });
}
