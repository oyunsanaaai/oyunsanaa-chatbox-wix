// /api/chat.ts
export const config = { runtime: 'edge' };

type Msg = { role:'user'|'assistant'|'system', content: any };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const { model, messages, imageData } = await req.json() as { model:'mini'|'pro', messages: Msg[], imageData?: string|null };

  const openaiModel = model === 'pro' ? 'gpt-4o' : 'gpt-4o-mini';

  // Build message content (vision if image provided)
  let content:any = [];
  const last = (messages && messages[0]?.content) ? String(messages[0].content) : '';
  content.push({ type:'text', text: last });

  if (imageData) {
    content.push({ type:'image_url', image_url: { url: imageData } });
  }

  const body = {
    model: openaiModel,
    messages: [
      { role:'system', content:'You are Oyunsanaa Chat. Be concise, friendly, and helpful in Mongolian.' },
      { role:'user', content }
    ],
    temperature: 0.6
  };

  try{
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY ?? ''}`
      },
      body: JSON.stringify(body)
    });

    if(!r.ok){
      const t = await r.text();
      return new Response(JSON.stringify({ reply:`Алдаа: ${r.status}`, error:t }), { status: 500, headers:{'Content-Type':'application/json'} });
    }
    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ reply, meta:{ used:model, image: !!imageData } }), { headers:{'Content-Type':'application/json'}});
  }catch(e:any){
    return new Response(JSON.stringify({ reply:'Сүлжээний алдаа.', error:String(e) }), { status: 500, headers:{'Content-Type':'application/json'} });
  }
}
