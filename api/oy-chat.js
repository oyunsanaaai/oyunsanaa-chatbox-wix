export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
    }

    let { model = 'gpt-4o-mini', msg = '', history = [] } = req.body || {};

    // OpenAI руу дамжуулах формат
    const messages = history.map(m => ({
      role: m.who === 'user' ? 'user' : 'assistant',
      content: String(m.html || '').replace(/<[^>]+>/g, '')
    }));
    messages.push({ role: 'user', content: msg });

    // OpenAI руу хүсэлт
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'OpenAI API error' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply });

  } catch (e) {
    console.error('oy-chat error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
