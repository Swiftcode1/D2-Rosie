'use client';

import type { Interest, MealStatus, PlanRequest } from '@/types';
import { minutesToTime, toMinutes } from '@/lib/mealLogic';

interface Props {
  request: PlanRequest;
  mealStatus: MealStatus;
  hasUserSpoken: boolean;
  onPlan: () => void;
  onClear: () => void;
  onToggleMeal: (slot: 'breakfast' | 'lunch' | 'dinner') => void;
  onToggleInterest: (i: Interest) => void;
  isPlanning: boolean;
}

export default function ConversationNotes({
  request,
  mealStatus,
  hasUserSpoken,
  onPlan,
  onClear,
  onToggleMeal,
  onToggleInterest,
  isPlanning
}: Props) {
  const startMins = toMinutes(request.startTime);
  const endMins = toMinutes(request.endTime);
  const windowMins = Math.max(0, endMins - startMins);
  const windowHours = Math.round((windowMins / 60) * 10) / 10;

  return (
    <section className="border-y border-[color:var(--line)] bg-[color:var(--paper-tint)]">
      <div className="mx-auto max-w-[1100px] px-8 py-20 sm:px-14 sm:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow">Your Preferences</div>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-[color:var(--ink)] sm:text-5xl">
              {hasUserSpoken ? 'Here is what I have noted' : 'A bespoke afternoon, in your words'}
            </h2>
          </div>
          {hasUserSpoken && (
            <button onClick={onClear} className="cta-link-soft">
              Start Over
            </button>
          )}
        </div>

        <dl className="mt-14 divide-y divide-[color:var(--line)] border-t border-[color:var(--line)]">
          <NoteRow label="Time" filled={Boolean(request.endTime && request.startTime)}>
            {windowMins > 0 ? (
              <span>
                <span className="text-[color:var(--ink)]">{windowHours} hours</span>
                <span className="mx-3 text-[color:var(--ink-faint)]">·</span>
                <span className="text-[color:var(--ink-soft)]">
                  {minutesToTime(startMins)} – {minutesToTime(endMins)}
                </span>
              </span>
            ) : (
              <span className="italic text-[color:var(--ink-faint)]">
                Say “I have five hours” or “until three o’clock”
              </span>
            )}
          </NoteRow>

          <NoteRow label="Budget" filled={Boolean(request.budget && request.budget > 0)}>
            {request.budget ? (
              <span className="text-[color:var(--ink)]">Under ${request.budget}</span>
            ) : (
              <span className="italic text-[color:var(--ink-faint)]">
                Say “under eighty dollars” or simply “premium”
              </span>
            )}
          </NoteRow>

          <NoteRow label="Meals" filled={anyMealOn(request)}>
            <div className="flex flex-wrap gap-2">
              <MealChip
                label="Breakfast"
                on={request.includeBreakfast}
                overlap={mealStatus.breakfast.overlap}
                onClick={() => onToggleMeal('breakfast')}
              />
              <MealChip
                label="Lunch"
                on={request.includeLunch}
                overlap={mealStatus.lunch.overlap}
                onClick={() => onToggleMeal('lunch')}
              />
              <MealChip
                label="Dinner"
                on={request.includeDinner}
                overlap={mealStatus.dinner.overlap}
                onClick={() => onToggleMeal('dinner')}
              />
            </div>
          </NoteRow>

          <NoteRow label="Interests" filled={request.interests.length > 0}>
            {request.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.interests.map((i) => (
                  <button
                    key={i}
                    onClick={() => onToggleInterest(i)}
                    className="border border-[color:var(--line)] bg-white px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:border-[color:var(--ink)]"
                  >
                    {i} ×
                  </button>
                ))}
              </div>
            ) : (
              <span className="italic text-[color:var(--ink-faint)]">
                Mention “scenic,” “food,” “art,” “wellness”…
              </span>
            )}
          </NoteRow>

          <NoteRow label="Walking" filled={request.walkingTolerance !== 'medium'}>
            {request.walkingTolerance === 'low' ? (
              <span className="text-[color:var(--ink)]">Less walking — rideshare friendly</span>
            ) : request.walkingTolerance === 'high' ? (
              <span className="text-[color:var(--ink)]">Plenty of walking welcome</span>
            ) : (
              <span className="italic text-[color:var(--ink-faint)]">
                Say “less walking” if you would prefer
              </span>
            )}
          </NoteRow>
        </dl>

        <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm font-light leading-relaxed text-[color:var(--ink-soft)]">
            When you are ready, Rosie will compose three itineraries — Relaxed, Balanced, and Packed —
            each anchored on Rosewood Sand Hill.
          </p>
          <button onClick={onPlan} disabled={isPlanning} className="cta-link">
            {isPlanning ? 'Composing…' : 'Plan My Day'}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M3 10a1 1 0 0 1 1-1h9.586L9.293 4.707a1 1 0 0 1 1.414-1.414l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L13.586 11H4a1 1 0 0 1-1-1Z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function anyMealOn(r: PlanRequest): boolean {
  return r.includeBreakfast || r.includeLunch || r.includeDinner;
}

function NoteRow({
  label,
  children,
  filled
}: {
  label: string;
  children: React.ReactNode;
  filled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-[200px_1fr] sm:gap-12">
      <dt className="eyebrow pt-1.5">{label}</dt>
      <dd
        className={`font-serif text-2xl font-light leading-snug ${
          filled ? 'text-[color:var(--ink)]' : ''
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function MealChip({
  label,
  on,
  overlap,
  onClick
}: {
  label: string;
  on: boolean;
  overlap: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition ${
        on
          ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-white'
          : overlap
            ? 'border-[color:var(--line)] bg-white text-[color:var(--ink)] hover:border-[color:var(--ink)]'
            : 'border-[color:var(--line)] bg-transparent text-[color:var(--ink-faint)]'
      }`}
    >
      {label}
    </button>
  );
}
