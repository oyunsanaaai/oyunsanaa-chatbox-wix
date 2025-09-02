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
const body = req.body || {};
const msg = String(body.msg || (body.messages?.[0]?.content) || '').trim();

if (!msg) {
  return res.status(400).json({ error: 'Empty message' });
}
const r = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Та Оюунсанаа чат. Дулаахан, ойлгомжтойгоор хариул.' },
      { role: 'user', content: msg }
    ]
  })
});

const data = await r.json();
const reply = data.choices?.[0]?.message?.content || 'Хариулт олдсонгүй.';
return res.status(200).json({ reply });
