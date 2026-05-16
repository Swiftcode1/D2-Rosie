'use client';

import { useEffect, useRef } from 'react';
import type { ConvMessage } from '@/lib/conversation';

interface Props {
  messages: ConvMessage[];
  isListening: boolean;
  isSpeaking: boolean;
  voiceError: string | null;
  started: boolean;
  onBegin: () => void;
  onMicTap: () => void;
  onRestart: () => void;
  onAutofill?: () => void;
  voiceSupported: boolean;
  elevenLabsConnected: boolean;
}

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=2400&q=85&auto=format&fit=crop';

export default function VoiceConcierge({
  messages,
  isListening,
  isSpeaking,
  voiceError,
  started,
  onBegin,
  onMicTap,
  onRestart,
  onAutofill,
  voiceSupported,
  elevenLabsConnected
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const latestRosie = [...messages].reverse().find((m) => m.speaker === 'rosie');
  const latestGuest = [...messages].reverse().find((m) => m.speaker === 'guest');

  return (
    <section className="relative w-full overflow-hidden bg-[color:var(--ink)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center px-8 py-20 text-center text-white sm:px-14 sm:py-24">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/70">Voice Concierge</div>

        {!started ? (
          <>
            <h1 className="mt-8 max-w-3xl font-serif text-5xl font-light leading-[1.05] tracking-wide sm:text-7xl">
              Tap to begin your conversation
            </h1>
            <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-white/80">
              Rosie will greet you, ask a few short questions, and compose three plans for the day.
            </p>
            <button
              onClick={onBegin}
              type="button"
              className="mt-14 group relative inline-flex h-32 w-32 items-center justify-center rounded-full border border-white/60 bg-white/10 text-white backdrop-blur transition hover:border-white hover:bg-white/20 sm:h-36 sm:w-36"
              aria-label="Begin conversation with Rosie"
            >
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="mt-5 text-[11px] uppercase tracking-[0.32em] text-white/70">
              Tap to begin
            </div>
            {!voiceSupported && (
              <div className="mt-3 text-xs text-white/80">
                Voice unavailable in this browser. Please use Chrome, Edge, or Safari with microphone access.
              </div>
            )}
            {voiceError && <div className="mt-3 text-xs text-white/80">{voiceError}</div>}
            {elevenLabsConnected && (
              <div className="mt-10">
                <span className="eyebrow text-white/70">ElevenLabs voice connected</span>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-6 max-w-3xl font-serif text-3xl font-light leading-[1.15] tracking-wide sm:mt-10 sm:text-5xl">
              {latestRosie?.text || 'Listening for your reply…'}
            </h1>

            <button
              onClick={onMicTap}
              type="button"
              disabled={!voiceSupported || isSpeaking}
              className={`mt-10 group relative inline-flex h-32 w-32 items-center justify-center rounded-full border transition sm:h-36 sm:w-36 ${
                isListening
                  ? 'border-white bg-white text-[color:var(--ink)]'
                  : isSpeaking
                    ? 'border-white/40 bg-white/10 text-white/50'
                    : voiceSupported
                      ? 'border-white/60 bg-white/10 text-white backdrop-blur hover:border-white hover:bg-white/20'
                      : 'cursor-not-allowed border-white/30 bg-transparent text-white/40'
              }`}
              aria-label="Tap to speak"
            >
              {isListening && (
                <span className="absolute -inset-2 animate-ping rounded-full border border-white/40" />
              )}
              {isSpeaking && (
                <span className="absolute -inset-2 animate-pulse rounded-full border border-[color:var(--gold-soft)]" />
              )}
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
              </svg>
            </button>

            <div className="mt-5 text-[11px] uppercase tracking-[0.32em] text-white/70">
              {isSpeaking
                ? 'Rosie is speaking…'
                : isListening
                  ? 'Listening — speak now'
                  : 'Tap to reply'}
            </div>

            {voiceError && <div className="mt-3 text-xs text-white/80">{voiceError}</div>}

            {latestGuest && (
              <div className="mt-10 max-w-3xl border border-white/20 bg-black/30 px-8 py-5 text-left backdrop-blur">
                <div className="eyebrow text-white/60">You</div>
                <div className="mt-2 font-serif text-lg leading-snug text-white">
                  “{latestGuest.text}”
                </div>
              </div>
            )}

            {messages.length > 2 && (
              <details className="mt-8 w-full max-w-3xl text-left">
                <summary className="cursor-pointer text-[11px] uppercase tracking-[0.32em] text-white/60 hover:text-white">
                  Full conversation
                </summary>
                <div
                  ref={scrollRef}
                  className="mt-4 max-h-72 space-y-3 overflow-y-auto border-t border-white/15 pt-4"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm leading-relaxed ${
                        m.speaker === 'rosie' ? 'text-[color:var(--gold-soft)]' : 'text-white/90'
                      }`}
                    >
                      <span className="mr-3 inline-block w-12 text-[10px] uppercase tracking-[0.28em] opacity-60">
                        {m.speaker === 'rosie' ? 'Rosie' : 'You'}
                      </span>
                      {m.text}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              <button onClick={onRestart} className="cta-link-soft text-white/70 hover:text-white">
                Start Over
              </button>
              {onAutofill && (
                <button
                  onClick={onAutofill}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-white/60 border border-white/30 hover:border-white/60 hover:text-white/90 transition"
                >
                  Autofill Query
                </button>
              )}
              {elevenLabsConnected && (
                <span className="eyebrow text-white/70">ElevenLabs voice</span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
