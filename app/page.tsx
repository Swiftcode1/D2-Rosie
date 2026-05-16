'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import VoiceConcierge from '@/components/VoiceConcierge';
import GuestProfileCard from '@/components/GuestProfileCard';
import PlanningPanel from '@/components/PlanningPanel';
import ItineraryResults from '@/components/ItineraryResults';
import type { GuestProfile, Itinerary, MealStatus, PlanRequest } from '@/types';
import { DEFAULT_PROFILE, loadProfile } from '@/lib/profileStorage';
import { generateItineraries, parseFreeText } from '@/lib/planner';
import { detectMealOverlap, minutesToTime, toMinutes } from '@/lib/mealLogic';

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
  rawText: 'I have 5 hours from 10 AM to 3 PM, want something scenic and local, include lunch, less walking, under $80.'
};

export default function Page() {
  const [profile, setProfile] = useState<GuestProfile>(DEFAULT_PROFILE);
  const [request, setRequest] = useState<PlanRequest>(SEED_REQUEST);
  const [transcript, setTranscript] = useState<string>(SEED_REQUEST.rawText || '');
  const [assistantReply, setAssistantReply] = useState<string>('');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

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

  const handleVoiceSubmit = async (text: string) => {
    setIsPlanning(true);
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
    setIsPlanning(false);
  };

  const handlePlan = () => {
    setIsPlanning(true);
    const plans = generateItineraries(request, profile);
    setItineraries(plans);
    setAssistantReply(buildAssistantReply(request.rawText || 'your request', request, plans, mealStatus));
    setIsPlanning(false);
  };

  return (
    <main className="min-h-screen bg-cream-50">
      <Header />
      <div className="mx-auto max-w-7xl space-y-16 px-6 py-12 sm:px-10">
        <VoiceConcierge
          transcript={transcript}
          assistantReply={assistantReply}
          onSubmit={handleVoiceSubmit}
          onTranscriptChange={setTranscript}
          isPlanning={isPlanning}
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
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

        {itineraries.length > 0 && (
          <ItineraryResults
            itineraries={itineraries}
            profile={profile}
            transportation={request.transportation}
          />
        )}

        {itineraries.length === 0 && (
          <div className="rounded-3xl border border-dashed border-rosie-200 bg-white/60 p-10 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-gold-500">Ready when you are</div>
            <h3 className="mt-2 font-serif text-2xl text-charcoal-700">
              Tap “Plan my itinerary” to see three handcrafted plans.
            </h3>
            <p className="mt-2 text-sm text-charcoal-400">
              Try the demo prompt: “I have 5 hours from 10 AM to 3 PM, want something scenic and local, include
              lunch, less walking, under $80.”
            </p>
          </div>
        )}

        <footer className="border-t border-cream-200 pt-6 text-center text-xs text-charcoal-400">
          Rosie · Hackathon MVP · Planning from Rosewood Sand Hill, Menlo Park
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
