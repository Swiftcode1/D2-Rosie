'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import VoiceConcierge from '@/components/VoiceConcierge';
import GuestProfileCard from '@/components/GuestProfileCard';
import PlanningPanel from '@/components/PlanningPanel';
import ItineraryResults from '@/components/ItineraryResults';
import type { GuestProfile, Itinerary, MealStatus, PlanRequest } from '@/types';
import { DEFAULT_PROFILE, loadProfile } from '@/lib/profileStorage';
import { generateItineraries, parseFreeText } from '@/lib/planner';
import { detectMealOverlap, toMinutes } from '@/lib/mealLogic';

const SEED_REQUEST: PlanRequest = {
  startTime: '10:00',
  endTime: '15:00',
  budget: 80,
  stops: 3,
  transportation: 'rideshare',
  interests: ['scenic', 'food'],
  pace: 'balanced',
  walkingTolerance: 'low',
  includeBreakfast: false,
  includeLunch: true,
  includeDinner: false,
  rawText: ''
};

export default function Page() {
  const [profile, setProfile] = useState<GuestProfile>(DEFAULT_PROFILE);
  const [request, setRequest] = useState<PlanRequest>(SEED_REQUEST);
  const [transcript, setTranscript] = useState<string>('');
  const [assistantReply, setAssistantReply] = useState<string>('');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [planVersion, setPlanVersion] = useState(0);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [isPlanning, setIsPlanning] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  // Live-parse: as the guest types or speaks into "Tell Rosie what you would
  // like to do", continuously update the Planning section so its collapsed
  // summary reflects the latest interpretation (time window, budget, interests,
  // meals, walking, transportation).
  useEffect(() => {
    const parsed = parseFreeText(transcript);
    setRequest((curr) => {
      const next: PlanRequest = { ...curr, rawText: transcript, ...parsed };
      if (parsed.hours && !parsed.startTime) {
        const startMins = toMinutes(curr.startTime || '10:00');
        next.startTime = curr.startTime || '10:00';
        next.endTime = minutes24(startMins + parsed.hours * 60);
      }
      return next;
    });
  }, [transcript]);

  // Auto-regenerate "The Day Ahead" cards whenever the typed request or any
  // form field settles (debounced). We deliberately skip assistantReply +
  // scroll here so we don't trigger TTS or yank the viewport on each tweak —
  // the explicit submit / voice paths still own those.
  useEffect(() => {
    if (!transcript.trim()) return;
    const id = setTimeout(() => {
      const plans = generateItineraries(request, profile);
      setItineraries(plans);
      setPlanVersion((v) => v + 1);
    }, 500);
    return () => clearTimeout(id);
  }, [transcript, request, profile]);

  const mealStatus: MealStatus = useMemo(() => {
    const detected = detectMealOverlap(request.startTime, request.endTime);
    return {
      breakfast: { overlap: detected.breakfast.overlap, included: request.includeBreakfast },
      lunch: { overlap: detected.lunch.overlap, included: request.includeLunch },
      dinner: { overlap: detected.dinner.overlap, included: request.includeDinner }
    };
  }, [request.startTime, request.endTime, request.includeBreakfast, request.includeLunch, request.includeDinner]);

  const toggleMeal = (slot: 'breakfast' | 'lunch' | 'dinner') => {
    setRequest((r) => ({
      ...r,
      includeBreakfast: slot === 'breakfast' ? !r.includeBreakfast : r.includeBreakfast,
      includeLunch: slot === 'lunch' ? !r.includeLunch : r.includeLunch,
      includeDinner: slot === 'dinner' ? !r.includeDinner : r.includeDinner
    }));
  };

  const planFromText = (rawText: string) => {
    setIsPlanning(true);
    const text = rawText.trim();
    setTranscript(text);

    const parsed = parseFreeText(text);
    let next: PlanRequest = { ...request, rawText: text, ...parsed };

    if (parsed.hours && !parsed.startTime) {
      const startMins = toMinutes(request.startTime || '10:00');
      next.startTime = request.startTime || '10:00';
      next.endTime = minutes24(startMins + parsed.hours * 60);
    }

    const meal = detectMealOverlap(next.startTime, next.endTime);
    if (meal.breakfast.overlap && parsed.includeBreakfast === undefined) next.includeBreakfast = true;
    if (meal.lunch.overlap && parsed.includeLunch === undefined) next.includeLunch = true;
    if (meal.dinner.overlap && parsed.includeDinner === undefined) next.includeDinner = true;

    setRequest(next);

    const plans = generateItineraries(next, profile);
    setItineraries(plans);
    setAssistantReply(buildAssistantReply(text, next, plans, meal));
    setPlanVersion((v) => v + 1);
    setScrollTrigger((v) => v + 1);
    setIsPlanning(false);
  };

  const handleVoiceSubmit = (text: string) => {
    planFromText(text);
  };

  const handlePlan = () => {
    // Re-parse the latest text the guest typed so the plan always reflects
    // what's currently in the textarea, plus any tuning from the form.
    planFromText(transcript || request.rawText || '');
  };

  useEffect(() => {
    if (scrollTrigger === 0) return;
    const id = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [scrollTrigger]);

  return (
    <main className="min-h-screen bg-cream-50">
      <Header />
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
        <VoiceConcierge
          transcript={transcript}
          assistantReply={assistantReply}
          onSubmit={handleVoiceSubmit}
          onTranscriptChange={setTranscript}
          isPlanning={isPlanning}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <GuestProfileCard profile={profile} onChange={setProfile} />
          <PlanningPanel
            request={request}
            mealStatus={mealStatus}
            onChange={setRequest}
            onPlan={handlePlan}
            onToggleMeal={toggleMeal}
            isPlanning={isPlanning}
          />
        </div>

        <div ref={resultsRef}>
          {itineraries.length > 0 && (
            <ItineraryResults
              itineraries={itineraries}
              profile={profile}
              transportation={request.transportation}
              guestRequest={transcript}
              planVersion={planVersion}
            />
          )}

          {itineraries.length === 0 && (
            <div className="border border-charcoal-700/10 bg-cream-50 p-14 text-center">
              <div className="flex items-center justify-center gap-3 text-gold-400">
                <span className="inline-block h-px w-10 bg-gold-300" />
                <span className="text-[10px] uppercase tracking-[0.4em]">Ready when you are</span>
                <span className="inline-block h-px w-10 bg-gold-300" />
              </div>
              <h3 className="mt-5 font-serif text-3xl italic text-charcoal-700">
                Three handcrafted plans, a breath away.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-charcoal-500">
                Try the demo prompt — "I have 5 hours from 10 AM to 3 PM, want something scenic and local, include
                lunch, less walking, under $80."
              </p>
            </div>
          )}
        </div>

        <footer className="mt-10 border-t border-charcoal-700/10 pt-8 text-center">
          <div className="wordmark text-2xl text-charcoal-700">Rosie</div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.35em] text-charcoal-400">
            In residence at Rosewood Sand Hill · Menlo Park, California
          </div>
        </footer>
      </div>
    </main>
  );
}

function minutes24(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function buildAssistantReply(
  text: string,
  req: PlanRequest,
  plans: Itinerary[],
  meals: MealStatus
): string {
  const balanced = plans.find((p) => p.track === 'balanced') || plans[0];
  if (!balanced) return 'I can help with that. Let me know any tweaks.';
  const mealNote = req.includeLunch && meals.lunch.overlap
    ? ' Since your window overlaps lunch, I included a fast but well-reviewed lunch stop.'
    : req.includeBreakfast && meals.breakfast.overlap
      ? ' I included breakfast inside your morning window.'
      : req.includeDinner && meals.dinner.overlap
        ? ' I included a dinner stop in your evening window.'
        : '';
  const budgetNote = balanced.totalCost > req.budget
    ? ` Heads up — the balanced plan runs $${balanced.totalCost}, just above your $${req.budget} budget.`
    : ` Your balanced plan comes in at $${balanced.totalCost}, comfortably within your $${req.budget} budget.`;
  return `Here are three plans for your ${Math.round((toMinutes(req.endTime) - toMinutes(req.startTime)) / 60)}-hour window — relaxed, balanced, and packed.${mealNote}${budgetNote} I kept a ${balanced.returnBufferMinutes}-minute return buffer to Rosewood Sand Hill so you’re not rushed.`;
}
