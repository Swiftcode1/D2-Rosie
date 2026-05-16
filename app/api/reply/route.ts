import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'no_openai_key' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { missingInfo, userResponse, context } = body;

  if (!missingInfo || !userResponse) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Rosie, a friendly and professional concierge at Rosewood Sand Hill hotel in Menlo Park, California. Your goal is to gather specific information from guests to plan their day.

Current context: ${context || 'Starting a new conversation'}

Missing information needed: ${missingInfo}

The guest just said: "${userResponse}"

Your task:
1. Acknowledge what the guest said (even if it's unclear or wrong)
2. Gently guide them back to providing the missing information
3. Be conversational, warm, and professional
4. Keep responses brief (1-2 sentences max)
5. Don't repeat the exact same question - vary your approach
6. If they gave partial information, acknowledge it and ask for the rest

Return ONLY your reply text, no explanations or JSON.`
          },
          {
            role: 'user',
            content: userResponse
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      return NextResponse.json({ error: 'openai_failed', detail: msg.slice(0, 200) }, { status: r.status });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content;
    
    if (!reply) {
      return NextResponse.json({ error: 'no_content' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: 'upstream', detail: e?.message }, { status: 502 });
  }
}
