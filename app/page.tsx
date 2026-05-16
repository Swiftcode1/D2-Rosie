'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import VoiceConcierge from '@/components/VoiceConcierge';
import ItineraryResults from '@/components/ItineraryResults';
import type { GuestProfile, Itinerary } from '@/types';
import { DEFAULT_PROFILE, loadProfile } from '@/lib/profileStorage';
import { generateItineraries } from '@/lib/planner';
import {
  beginGreeting,
  initialState,
  processGuest,
  startOver,
  type ConvState
} from '@/lib/conversation';

interface RecordingHandle {
  stop: () => void;
}

export default function Page() {
  const [profile, setProfile] = useState<GuestProfile>(DEFAULT_PROFILE);
  const [conv, setConv] = useState<ConvState>(() => initialState());
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [started, setStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const profileRef = useRef(profile);
  const convRef = useRef(conv);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingRef = useRef<RecordingHandle | null>(null);
  const handlingGuestRef = useRef(false);
  const startedRef = useRef(false);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    convRef.current = conv;
  }, [conv]);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const agentId =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID : undefined;
  const elevenLabsConnected = Boolean(agentId);

  useEffect(() => {
    setProfile(loadProfile());
    if (typeof window !== 'undefined') {
      const ok =
        Boolean((window as any).MediaRecorder) &&
        Boolean(navigator.mediaDevices?.getUserMedia);
      setVoiceSupported(ok);
    }
  }, []);

  const stopAudio = useCallback(() => {
    try {
      audioRef.current?.pause();
      audioRef.current = null;
    } catch {}
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, []);

  const stopMic = useCallback(() => {
    try {
      recordingRef.current?.stop();
    } catch {}
    recordingRef.current = null;
    setIsListening(false);
  }, []);

  const beginRecording = useCallback(
    async (onText: (text: string) => void) => {
      setVoiceError(null);
      let stream: MediaStream | null = null;
      let recorder: MediaRecorder | null = null;
      let audioCtx: AudioContext | null = null;
      let raf = 0;
      let stopped = false;
      let uploaded = false;

      const cleanup = () => {
        if (stopped) return;
        stopped = true;
        try {
          if (raf) cancelAnimationFrame(raf);
        } catch {}
        try {
          if (recorder && recorder.state === 'recording') recorder.stop();
        } catch {}
        try {
          audioCtx?.close();
        } catch {}
        stream?.getTracks().forEach((t) => t.stop());
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        const name = e?.name;
        if (name === 'NotAllowedError') {
          setVoiceError('Microphone permission was denied. Allow mic access in your browser.');
        } else if (name === 'NotFoundError') {
          setVoiceError('No microphone was detected on this device.');
        } else {
          setVoiceError('Could not access the microphone.');
        }
        setIsListening(false);
        return;
      }

      const preferredMimes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      const supported = preferredMimes.find(
        (m) => (window as any).MediaRecorder?.isTypeSupported?.(m)
      );

      try {
        recorder = supported
          ? new MediaRecorder(stream, { mimeType: supported })
          : new MediaRecorder(stream);
      } catch {
        setVoiceError('Recording is not supported in this browser.');
        cleanup();
        setIsListening(false);
        return;
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        cleanup();
        if (uploaded) return;
        uploaded = true;
        const mime = recorder!.mimeType || supported || 'audio/webm';
        const blob = new Blob(chunks, { type: mime });
        if (blob.size < 1200) {
          setIsListening(false);
          return;
        }
        const fd = new FormData();
        fd.append('audio', blob, `audio.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
        try {
          const r = await fetch('/api/stt', { method: 'POST', body: fd });
          if (!r.ok) {
            if (r.status === 503) {
              setVoiceError(
                'Voice transcription needs ELEVENLABS_API_KEY in your .env.local — please add it and restart.'
              );
            } else {
              setVoiceError(`Voice transcription failed (${r.status}). Try again.`);
            }
            setIsListening(false);
            return;
          }
          const data = await r.json();
          const text = (data?.text || '').trim();
          setIsListening(false);
          if (text.length > 1) onText(text);
        } catch {
          setVoiceError('Could not reach the voice service. Check your network and try again.');
          setIsListening(false);
        }
      };

      try {
        recorder.start();
        setIsListening(true);
      } catch {
        setVoiceError('Could not start recording.');
        cleanup();
        setIsListening(false);
        return;
      }

      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtx = new Ctx();
        const source = audioCtx!.createMediaStreamSource(stream);
        const analyser = audioCtx!.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const startedAt = Date.now();
        const SILENCE_MS = 2500;
        const MAX_MS = 30_000;
        const MIN_LISTEN_MS = 800;
        const THRESHOLD = 14;

        let lastSpeech = Date.now();
        let everSpoke = false;

        const tick = () => {
          if (stopped) return;
          analyser.getByteFrequencyData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i];
          const avg = sum / buf.length;
          if (avg > THRESHOLD) {
            lastSpeech = Date.now();
            everSpoke = true;
          }
          const now = Date.now();
          if (now - startedAt > MAX_MS) {
            try {
              recorder!.stop();
            } catch {}
            return;
          }
          if (everSpoke && now - lastSpeech > SILENCE_MS && now - startedAt > MIN_LISTEN_MS) {
            try {
              recorder!.stop();
            } catch {}
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        // VAD failed — recording will still work but won't auto-stop on silence
      }

      recordingRef.current = {
        stop: () => {
          try {
            if (recorder && recorder.state === 'recording') recorder.stop();
            else cleanup();
          } catch {
            cleanup();
          }
        }
      };
    },
    []
  );

  const speakWithBrowser = useCallback((text: string, onDone: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        /Samantha|Google US English|Microsoft Aria|Microsoft Jenny|Google UK English Female/i.test(v.name)
      );
      if (preferred) utter.voice = preferred;
      utter.rate = 1;
      utter.pitch = 1.05;
      utter.onend = onDone;
      utter.onerror = onDone;
      window.speechSynthesis.speak(utter);
    } catch {
      onDone();
    }
  }, []);

  const handleGuestTextRef = useRef<(text: string) => void>(() => {});

  const speak = useCallback(
    async (text: string, autoListenAfter: boolean) => {
      if (!text) return;
      stopMic();
      stopAudio();
      setIsSpeaking(true);

      const onDone = () => {
        setIsSpeaking(false);
        if (autoListenAfter && startedRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && startedRef.current) {
              beginRecording((t) => handleGuestTextRef.current(t));
            }
          }, 250);
        }
      };

      try {
        const r = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        if (r.ok) {
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            onDone();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            speakWithBrowser(text, onDone);
          };
          await audio.play();
          return;
        }
      } catch {
        // fall through
      }
      speakWithBrowser(text, onDone);
    },
    [speakWithBrowser, beginRecording, stopAudio, stopMic]
  );

  const handleGuestText = useCallback(
    (text: string) => {
      if (handlingGuestRef.current) return;
      handlingGuestRef.current = true;
      const result = processGuest(convRef.current, text, profileRef.current);
      setConv(result.state);

      if (result.readyToPlan) {
        const plans = generateItineraries(result.state.request, profileRef.current);
        setItineraries(plans);
      }

      const autoListen = !result.readyToPlan;
      speak(result.reply, autoListen).finally(() => {
        handlingGuestRef.current = false;
      });
    },
    [speak]
  );

  useEffect(() => {
    handleGuestTextRef.current = handleGuestText;
  }, [handleGuestText]);

  const unlockAudio = useCallback(async () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume();
        setTimeout(() => ctx.close().catch(() => {}), 100);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance('');
          window.speechSynthesis.speak(u);
        } catch {}
      }
    } catch {}
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e: any) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow mic access in your browser, then tap to begin again.'
          : e?.name === 'NotFoundError'
            ? 'No microphone detected on this device.'
            : 'Microphone is unavailable.';
      setVoiceError(msg);
      return false;
    }
  }, []);

  const handleBegin = useCallback(async () => {
    if (startedRef.current) return;
    await unlockAudio();
    if (voiceSupported) {
      const granted = await requestMicPermission();
      if (!granted) return;
    }
    setStarted(true);
    startedRef.current = true;
    const { state, reply } = beginGreeting(convRef.current);
    setConv(state);
    speak(reply, true);
  }, [speak, unlockAudio, requestMicPermission, voiceSupported]);

  const handleMicTap = useCallback(() => {
    if (isSpeakingRef.current) {
      stopAudio();
      setIsSpeaking(false);
      return;
    }
    if (recordingRef.current) {
      stopMic();
      return;
    }
    beginRecording((t) => handleGuestTextRef.current(t));
  }, [stopAudio, stopMic, beginRecording]);

  const handleRestart = useCallback(() => {
    stopMic();
    stopAudio();
    setItineraries([]);
    setVoiceError(null);
    const fresh = startOver();
    setConv(fresh);
    setStarted(false);
    startedRef.current = false;
  }, [stopAudio, stopMic]);

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <VoiceConcierge
        messages={conv.messages}
        isListening={isListening}
        isSpeaking={isSpeaking}
        voiceError={voiceError}
        started={started}
        onBegin={handleBegin}
        onMicTap={handleMicTap}
        onRestart={handleRestart}
        voiceSupported={voiceSupported}
        elevenLabsConnected={elevenLabsConnected}
      />

      {itineraries.length > 0 ? (
        <ItineraryResults
          itineraries={itineraries}
          profile={profile}
          transportation={conv.request.transportation}
        />
      ) : (
        <section className="border-b border-[color:var(--line)] bg-white">
          <div className="mx-auto max-w-[900px] px-8 py-24 text-center sm:px-14 sm:py-32">
            <div className="eyebrow">Awaiting Your Conversation</div>
            <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[color:var(--ink)] sm:text-5xl">
              {started
                ? 'A plan will appear here as soon as Rosie has what she needs.'
                : 'Tap to begin — Rosie will ask a few short questions.'}
            </h3>
            <p className="mx-auto mt-6 max-w-xl text-base font-light italic leading-relaxed text-[color:var(--ink-soft)]">
              You can simply say: “I have five hours, want lunch, like scenic spots and local food,
              under eighty dollars, with less walking.”
            </p>
          </div>
        </section>
      )}

      <footer className="bg-[color:var(--paper-tint)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-8 py-10 text-center sm:flex-row sm:px-14">
          <div className="eyebrow">Rosie · Voice-First Concierge</div>
          <div className="eyebrow">Rosewood Sand Hill · Menlo Park, California</div>
        </div>
      </footer>
    </main>
  );
}
