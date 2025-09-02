export default async function handler(req, res) {
  // 1) CORS allow list — regex-ээр уян хатан болгоно
  const ALLOW = [
    /^https?:\/\/chat\.oyunsanaa\.com$/,                               // production
    /^https?:\/\/(?:.*-)?oyunsanaa-chatbox-wix\.vercel\.app$/,          // preview + prod vercel
    /^http:\/\/localhost:3000$/                                         // local dev
  ];

  const origin = req.headers.origin || '';
  const isAllowed = ALLOW.some(re => re.test(origin));

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Доошоо бүх return дээр CORS header гарч байх нь чухал тул
  // дээрх headers-ийг эхэнд нь л тавьсан.
  ...
}
