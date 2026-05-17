import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 });
  }

  let text = '';
  try {
    const body = await req.json();
    text = String(body?.text || '').slice(0, 2000);
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true
        }
      }),
      cache: 'no-store'
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      return NextResponse.json({ error: 'tts_failed', detail: msg.slice(0, 200) }, { status: r.status });
    }

    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'upstream', detail: e?.message }, { status: 502 });
  }
}
