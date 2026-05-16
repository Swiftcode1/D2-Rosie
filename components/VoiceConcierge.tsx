'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  transcript: string;
  assistantReply: string;
  onSubmit: (text: string) => void;
  onTranscriptChange: (t: string) => void;
  isPlanning: boolean;
}

const SEED_PROMPT =
  'I have 5 hours, want lunch, like scenic spots and local food, and want to stay under $80.';

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

export default function VoiceConcierge({
  transcript,
  assistantReply,
  onSubmit,
  onTranscriptChange,
  isPlanning
}: Props) {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const agentId =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID : undefined;
  const hasElevenLabsAgent = Boolean(agentId);

  useEffect(() => {
    if (!hasElevenLabsAgent) return;
    if (typeof window === 'undefined') return;
    if (document.querySelector('script[data-convai="1"]')) {
      setWidgetReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    s.async = true;
    s.type = 'text/javascript';
    s.dataset.convai = '1';
    s.onload = () => setWidgetReady(true);
    document.body.appendChild(s);
  }, [hasElevenLabsAgent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      const text =
        (typeof detail === 'string' && detail) ||
        detail?.text ||
        detail?.message ||
        detail?.transcript ||
        '';
      if (text) {
        onTranscriptChange(text);
        onSubmit(text);
      }
    };
    const names = ['convai-user-message', 'convai-message', 'elevenlabs-convai-message'];
    names.forEach((n) => window.addEventListener(n, handler as EventListener));
    return () => names.forEach((n) => window.removeEventListener(n, handler as EventListener));
  }, [onSubmit, onTranscriptChange]);

  useEffect(() => {
    if (hasElevenLabsAgent) return;
    if (typeof window === 'undefined') return;
    const w = window as any;
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) return;
    const rec: SpeechRecognitionLike = new Speech();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (ev: any) => {
      let text = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      setInput(text);
      onTranscriptChange(text);
    };
    rec.onerror = () => {
      setVoiceError('Browser voice recognition is unavailable. Use the text box below.');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [onTranscriptChange, hasElevenLabsAgent]);

  useEffect(() => {
    if (hasElevenLabsAgent) return;
    if (!assistantReply) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(assistantReply);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /Samantha|Google US English|Microsoft Aria|Microsoft Jenny|Google UK English Female/i.test(v.name)
      );
      if (preferred) utter.voice = preferred;
      utter.rate = 1;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
  }, [assistantReply, hasElevenLabsAgent]);

  const toggleListen = () => {
    if (!recRef.current) {
      setVoiceError('Browser voice not detected — type your request instead.');
      return;
    }
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      setVoiceError(null);
      setListening(true);
      try {
        recRef.current.start();
      } catch {
        setListening(false);
      }
    }
  };

  const handleSubmit = () => {
    const text = (input || SEED_PROMPT).trim();
    onSubmit(text);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-rosie-100 bg-white shadow-soft">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rosie-300 via-gold-300 to-rosie-300" />
      <div className="grid gap-12 p-10 sm:p-14 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-8">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold-500">Talk to Rosie</div>
            <h2 className="mt-3 font-serif text-4xl text-charcoal-700">How can I help today?</h2>
            <p className="mt-3 max-w-md text-base text-charcoal-400">
              Tap the microphone or type your request. Rosie will plan a custom itinerary anchored on the hotel.
            </p>
          </div>

          {hasElevenLabsAgent ? (
            <div className="flex flex-col items-start gap-4">
              <div className="rounded-2xl border border-rosie-100 bg-cream-50 p-6">
                <div className="text-[10px] uppercase tracking-[0.3em] text-rosie-600">ElevenLabs ConvAI</div>
                <div className="mt-2 text-sm text-charcoal-500">
                  Tap the floating Rosie bubble (bottom-right) to start a natural voice conversation.
                </div>
              </div>
              {widgetReady && (
                <elevenlabs-convai agent-id={agentId}></elevenlabs-convai>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <button
                onClick={toggleListen}
                type="button"
                className={`group relative inline-flex h-36 w-36 items-center justify-center rounded-full transition ${
                  listening
                    ? 'bg-rosie-500 text-white shadow-soft'
                    : 'bg-gradient-to-br from-rosie-100 to-rosie-200 text-rosie-600 hover:from-rosie-200 hover:to-rosie-300'
                }`}
                aria-label="Talk to Rosie"
              >
                {listening && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-rosie-300 opacity-60" />
                )}
                <svg viewBox="0 0 24 24" className="relative h-14 w-14" fill="currentColor">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                  <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
                </svg>
              </button>
              <div className="text-xs uppercase tracking-[0.25em] text-charcoal-400">
                {listening ? 'Listening…' : 'Tap to speak'}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-cream-200 bg-cream-50 p-5 text-xs leading-relaxed text-charcoal-400">
            <div className="font-semibold uppercase tracking-wider text-gold-500">Voice setup</div>
            <div className="mt-2">
              {hasElevenLabsAgent ? (
                <>
                  Connected to ElevenLabs agent <span className="font-mono text-charcoal-500">{agentId}</span>.
                  Voice in and natural voice out are handled by the ConvAI widget.
                </>
              ) : (
                <>
                  Browser voice fallback active — Chrome / Edge only, and sounds robotic. Add{' '}
                  <code className="font-mono">NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> to your{' '}
                  <code>.env</code> and reload to enable the natural ElevenLabs voice.
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <label className="text-xs uppercase tracking-[0.25em] text-charcoal-400">
            Or type your request
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTranscriptChange(e.target.value);
            }}
            placeholder={SEED_PROMPT}
            rows={5}
            className="rounded-2xl border border-cream-200 bg-cream-50 p-5 font-serif text-lg leading-relaxed text-charcoal-600 outline-none transition focus:border-rosie-300 focus:bg-white"
          />

          <button
            onClick={handleSubmit}
            disabled={isPlanning}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rosie-500 px-7 py-4 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-rosie-600 disabled:opacity-60"
          >
            {isPlanning ? 'Planning…' : 'Plan my itinerary'}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M3 10a1 1 0 0 1 1-1h9.586L9.293 4.707a1 1 0 0 1 1.414-1.414l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L13.586 11H4a1 1 0 0 1-1-1Z" />
            </svg>
          </button>

          {voiceError && (
            <div className="text-xs text-rosie-600">{voiceError}</div>
          )}

          <div className="mt-2 rounded-2xl border border-rosie-100 bg-rosie-50/60 p-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-rosie-600">Guest request</div>
            <div className="mt-3 font-serif text-xl leading-relaxed text-charcoal-700">
              {transcript || <span className="text-charcoal-400">Awaiting your request…</span>}
            </div>
            {assistantReply && (
              <div className="mt-5 border-t border-rosie-100 pt-5">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold-500">Rosie</div>
                <div className="mt-3 text-base leading-relaxed text-charcoal-600">{assistantReply}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
