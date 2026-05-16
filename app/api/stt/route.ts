import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const audio = formData.get('audio');
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: 'no_audio' }, { status: 400 });
  }
  if (audio.size < 500) {
    return NextResponse.json({ text: '' });
  }

  const modelId = process.env.ELEVENLABS_STT_MODEL_ID || 'scribe_v1';

  const upstream = new FormData();
  upstream.append('file', audio, 'audio.webm');
  upstream.append('model_id', modelId);
  upstream.append('language_code', 'eng');

  try {
    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: upstream,
      cache: 'no-store'
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return NextResponse.json(
        { error: 'stt_failed', detail: detail.slice(0, 300) },
        { status: r.status }
      );
    }
    const data = await r.json();
    return NextResponse.json({ text: (data?.text || '').trim() });
  } catch (e: any) {
    return NextResponse.json({ error: 'upstream', detail: e?.message }, { status: 502 });
  }
}
