import { anthropic, MODEL } from '@/lib/anthropic';

export async function GET() {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 64,
    messages: [{ role: 'user', content: 'Say hello briefly.' }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return Response.json({ ok: true, message: text });
}
