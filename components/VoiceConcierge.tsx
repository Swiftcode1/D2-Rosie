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
  const [input, setInput] = useState(transcript || '');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // Stable refs so the recognition callbacks (set up once on mount)
  // always call the latest parent handlers / read the latest input.
  const onSubmitRef = useRef(onSubmit);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const sessionTextRef = useRef('');

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);
  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  // Keep the textarea synced if the parent updates the transcript
  // (e.g. after a successful submission, voice transcription, or seeding).
  useEffect(() => {
    if (transcript !== input) {
      setInput(transcript || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // Initialize browser speech recognition once. The callbacks read the
  // latest handlers from refs so we don't churn this whole instance.
  useEffect(() => {
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
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      sessionTextRef.current = text;
      setInput(text);
      onTranscriptChangeRef.current(text);
    };

    rec.onerror = (ev: any) => {
      const msg =
        ev?.error === 'not-allowed'
          ? 'Microphone permission denied. Enable it in your browser settings, or type your request below.'
          : 'Browser voice recognition is unavailable. Use the text box below.';
      setVoiceError(msg);
      setListening(false);
      sessionTextRef.current = '';
    };

    rec.onend = () => {
      setListening(false);
      const finalText = sessionTextRef.current.trim();
      sessionTextRef.current = '';
      if (finalText) {
        setVoiceNotice(`Heard: "${finalText.slice(0, 60)}${finalText.length > 60 ? '…' : ''}" — planning now…`);
        // Submit on the next tick so React can flush the input state first.
        setTimeout(() => onSubmitRef.current(finalText), 0);
      }
    };

    recRef.current = rec;
  }, []);

  useEffect(() => {
    if (assistantReply && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(assistantReply);
        utter.rate = 1;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore
      }
    }
  }, [assistantReply]);

  // Clear the "heard…" notice once the parent finishes planning and a new
  // assistant reply is available.
  useEffect(() => {
    if (assistantReply && voiceNotice) {
      const t = setTimeout(() => setVoiceNotice(null), 1500);
      return () => clearTimeout(t);
    }
  }, [assistantReply, voiceNotice]);

  const toggleListen = () => {
    if (!recRef.current) {
      setVoiceError('Browser voice not detected — type your request instead.');
      return;
    }
    if (listening) {
      recRef.current.stop(); // onend will auto-submit if we captured speech
      return;
    }
    setVoiceError(null);
    setVoiceNotice(null);
    sessionTextRef.current = '';
    setListening(true);
    try {
      recRef.current.start();
    } catch {
      setListening(false);
    }
  };

  const handleSubmit = () => {
    const text = (input || transcript || SEED_PROMPT).trim();
    onSubmit(text);
  };

  return (
    <section className="relative overflow-hidden border border-charcoal-700/10 bg-cream-50 shadow-card">
      <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col items-start gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold-400">
              <span className="inline-block h-px w-6 bg-gold-300" />
              Speak with Rosie
            </div>
            <h2 className="mt-4 font-serif text-3xl italic text-charcoal-700 sm:text-4xl">
              How may I assist you today?
            </h2>
            <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-charcoal-500">
              Tap the microphone and speak — Rosie will transcribe your request and refresh the plans automatically when you pause.
            </p>
          </div>

          <button
            onClick={toggleListen}
            type="button"
            className={`group relative inline-flex h-32 w-32 items-center justify-center border transition ${
              listening
                ? 'border-charcoal-700 bg-charcoal-700 text-cream-50'
                : 'border-charcoal-700/30 bg-transparent text-charcoal-600 hover:border-charcoal-700 hover:text-charcoal-700'
            }`}
            aria-label="Talk to Rosie"
            style={{ borderRadius: '50%' }}
          >
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-charcoal-700/30" />
            )}
            <svg viewBox="0 0 24 24" className="relative h-12 w-12" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
            </svg>
          </button>

          <div className="text-[10px] uppercase tracking-[0.35em] text-charcoal-400">
            {listening ? 'Listening… speak naturally' : voiceNotice ? 'Planning your day…' : 'Tap to speak'}
          </div>

          {voiceNotice && (
            <div className="w-full border-l-2 border-gold-300 bg-cream-100/60 px-4 py-3 text-xs font-light italic text-charcoal-600">
              {voiceNotice}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <label className="text-[10px] uppercase tracking-[0.35em] text-charcoal-500">
            Tell Rosie what you would like to do
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onTranscriptChange(e.target.value);
            }}
            placeholder={SEED_PROMPT}
            rows={4}
            className="border border-charcoal-700/15 bg-white p-5 font-serif text-xl italic text-charcoal-700 outline-none transition focus:border-charcoal-700"
          />

          <button
            onClick={handleSubmit}
            disabled={isPlanning}
            className="inline-flex items-center justify-center gap-3 border border-charcoal-700 bg-charcoal-700 px-8 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-cream-50 transition hover:bg-charcoal-600 disabled:opacity-60"
          >
            {isPlanning ? 'Planning…' : 'Plan my itinerary'}
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
              <path d="M3 10a1 1 0 0 1 1-1h9.586L9.293 4.707a1 1 0 0 1 1.414-1.414l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L13.586 11H4a1 1 0 0 1-1-1Z" />
            </svg>
          </button>

          {voiceError && (
            <div className="text-xs italic text-rosie-500">{voiceError}</div>
          )}

          <div className="border-l-2 border-rosie-500 bg-cream-100/50 p-6">
            <div className="text-[10px] uppercase tracking-[0.35em] text-rosie-500">Guest request</div>
            <div className="mt-3 font-serif text-xl italic leading-snug text-charcoal-700">
              {transcript || <span className="not-italic text-charcoal-400">Awaiting your request…</span>}
            </div>
            {assistantReply && (
              <div className="mt-5 border-t border-charcoal-700/10 pt-4">
                <div className="text-[10px] uppercase tracking-[0.35em] text-gold-400">Rosie</div>
                <div className="mt-2 font-light leading-relaxed text-charcoal-600">{assistantReply}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
