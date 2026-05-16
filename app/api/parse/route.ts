import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'no_openai_key' }, { status: 503 });
  }

  let text = '';
  try {
    const body = await req.json();
    text = String(body?.text || '').slice(0, 2000);
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

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
            content: `You are a travel concierge assistant parsing user requests. Extract structured information from natural language.

Return ONLY a JSON object with these fields:
- hours: number (duration in hours, or null if not specified)
- startTime: string (HH:MM format, or null if not specified)
- endTime: string (HH:MM format, or null if not specified)
- budget: number (budget in dollars, or null if not specified)
- interests: array of strings (from: scenic, food, art, wellness, shopping, outdoors, luxury, family-friendly, tech)
- walkingTolerance: string (low, medium, or high, or null if not specified)
- transportation: string (rideshare, driving, walking, hotel shuttle, or null if not specified)
- includeBreakfast: boolean (or null if not specified)
- includeLunch: boolean (or null if not specified)
- includeDinner: boolean (or null if not specified)

Rules:
- If user says "under X" or "below X", use that as budget
- If user mentions time like "3 pm" or "5:30", treat as endTime
- If user says "X hours", extract that number
- Map common phrases to interests: "scenic"/"views"/"nature" → scenic, "food"/"eat"/"restaurant" → food, "art"/"museum"/"gallery" → art, "spa"/"massage"/"relax" → wellness, "shop"/"boutique" → shopping, "hike"/"walk"/"outdoor" → outdoors
- walkingTolerance: "less walking"/"low walking"/"not much walking" → low, "lots of walking"/"long walks" → high
- transportation: "uber"/"lyft" → rideshare, "car"/"drive" → driving, "walk"/"on foot" → walking, "shuttle" → hotel shuttle
- Meals: "want lunch"/"include lunch" → includeLunch: true, "skip lunch"/"no lunch" → includeLunch: false (same for breakfast/dinner)
- IMPORTANT: If user gives open-ended responses like "anything", "whatever", "I'm flexible", "surprise me", "you decide", "open to anything", "doesn't matter", return interests: ["scenic", "food", "art"] as a reasonable default mix

Return valid JSON only, no explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      return NextResponse.json({ error: 'openai_failed', detail: msg.slice(0, 200) }, { status: r.status });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json({ error: 'no_content' }, { status: 500 });
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'invalid_json', raw: content }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: 'upstream', detail: e?.message }, { status: 502 });
  }
}
