export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  }

  try {
    const { text = '', chatHistory = [] } = req.body || {};
    const messages = [
      { role: 'system', content: 'Та Оюунсанаа туслах, энэрэнгүй, товч бөгөөд ойлгомжтой хариулна.' },
      ...chatHistory.slice(-6),
      { role: 'user', content: text || 'Сайн уу' },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '⚠️ Хариу ирсэнгүй.';

    res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
