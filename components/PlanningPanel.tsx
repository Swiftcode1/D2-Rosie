'use client';

import { useEffect, useRef, useState } from 'react';
import type { Interest, MealStatus, PlanRequest, Transportation, TravelStyle } from '@/types';
import MealTogglePanel from './MealTogglePanel';

const INTEREST_OPTIONS: Interest[] = [
  'food',
  'outdoors',
  'shopping',
  'art',
  'family-friendly',
  'luxury',
  'wellness',
  'tech',
  'scenic'
];

interface Props {
  request: PlanRequest;
  mealStatus: MealStatus;
  onChange: (r: PlanRequest) => void;
  onPlan: () => void;
  onToggleMeal: (slot: 'breakfast' | 'lunch' | 'dinner') => void;
  isPlanning: boolean;
}

export default function PlanningPanel({
  request,
  mealStatus,
  onChange,
  onPlan,
  onToggleMeal,
  isPlanning
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const update = (patch: Partial<PlanRequest>) => onChange({ ...request, ...patch });

  const toggleInterest = (i: Interest) => {
    const has = request.interests.includes(i);
    update({
      interests: has ? request.interests.filter((x) => x !== i) : [...request.interests, i]
    });
  };

  const meals = [
    request.includeBreakfast && 'breakfast',
    request.includeLunch && 'lunch',
    request.includeDinner && 'dinner'
  ].filter(Boolean) as string[];

  // Pulse the header whenever a meaningful planning field changes (window,
  // budget, interests, meals, etc.) — usually triggered by live parsing of
  // the guest's typed/voice request.
  const fingerprint =
    request.startTime +
    '|' +
    request.endTime +
    '|' +
    request.budget +
    '|' +
    request.stops +
    '|' +
    request.pace +
    '|' +
    request.walkingTolerance +
    '|' +
    request.transportation +
    '|' +
    request.interests.join(',') +
    '|' +
    [request.includeBreakfast, request.includeLunch, request.includeDinner].join(',');
  const prevFingerprint = useRef(fingerprint);
  useEffect(() => {
    if (prevFingerprint.current !== fingerprint) {
      prevFingerprint.current = fingerprint;
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 1400);
      return () => clearTimeout(t);
    }
  }, [fingerprint]);

  return (
    <section className="border border-charcoal-700/10 bg-cream-50 shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-4 px-8 py-6 text-left transition hover:bg-cream-100/40 ${
          justSynced ? 'bg-gold-100/40' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold-400">
              <span className="inline-block h-px w-6 bg-gold-300" />
              Planning
            </div>
            {justSynced && (
              <span className="inline-flex items-center gap-1.5 border border-gold-300 bg-cream-50 px-2 py-0.5 text-[9px] uppercase tracking-[0.3em] text-gold-500">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />
                Auto-tuned
              </span>
            )}
          </div>
          <h3 className="mt-2 font-serif text-2xl italic text-charcoal-700 sm:text-3xl">
            Tune your itinerary
          </h3>

          {request.rawText ? (
            <div className="mt-3 line-clamp-2 max-w-2xl border-l-2 border-rosie-500/70 pl-3 font-serif text-sm italic leading-snug text-charcoal-600">
              "{request.rawText}"
            </div>
          ) : (
            <div className="mt-3 text-xs font-light italic text-charcoal-400">
              Speak or type above and these settings will follow you in real time.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label="Window" value={`${request.startTime}–${request.endTime}`} />
            <Chip label="Budget" value={`$${request.budget}`} />
            <Chip label="Stops" value={String(request.stops)} />
            <Chip label="Pace" value={request.pace} />
            <Chip label="Transport" value={request.transportation} />
            <Chip label="Walking" value={request.walkingTolerance} />
            {request.interests.length > 0 && (
              <Chip
                label="Interests"
                value={`${request.interests.slice(0, 3).join(', ')}${
                  request.interests.length > 3 ? `, +${request.interests.length - 3}` : ''
                }`}
              />
            )}
            {meals.length > 0 && <Chip label="Meals" value={meals.join(', ')} />}
          </div>
        </div>
        <span
          className={`shrink-0 border border-charcoal-700/20 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-charcoal-600 transition ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="border-t border-charcoal-700/10 px-8 pb-8 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Start">
              <input
                type="time"
                value={request.startTime}
                onChange={(e) => onChange({ ...request, startTime: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={request.endTime}
                onChange={(e) => onChange({ ...request, endTime: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Budget ($)">
              <input
                type="number"
                value={request.budget}
                min={0}
                onChange={(e) => update({ budget: Number(e.target.value) })}
                className="input"
              />
            </Field>
            <Field label="Stops">
              <input
                type="number"
                value={request.stops}
                min={1}
                max={6}
                onChange={(e) => update({ stops: Number(e.target.value) })}
                className="input"
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Transportation">
              <select
                value={request.transportation}
                onChange={(e) => update({ transportation: e.target.value as Transportation })}
                className="input"
              >
                <option value="walking">Walking</option>
                <option value="rideshare">Rideshare</option>
                <option value="driving">Driving</option>
                <option value="hotel shuttle">Hotel shuttle</option>
              </select>
            </Field>
            <Field label="Pace">
              <select
                value={request.pace}
                onChange={(e) => update({ pace: e.target.value as TravelStyle })}
                className="input"
              >
                <option value="relaxed">Relaxed</option>
                <option value="balanced">Balanced</option>
                <option value="packed">Packed</option>
              </select>
            </Field>
            <Field label="Walking tolerance">
              <select
                value={request.walkingTolerance}
                onChange={(e) => update({ walkingTolerance: e.target.value as any })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.35em] text-charcoal-500">Interests</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => {
                const on = request.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] transition ${
                      on
                        ? 'border-charcoal-700 bg-charcoal-700 text-cream-50'
                        : 'border-charcoal-700/20 bg-transparent text-charcoal-500 hover:border-charcoal-700/60 hover:text-charcoal-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <MealTogglePanel status={mealStatus} onToggle={onToggleMeal} />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-charcoal-700/10 pt-6">
            <div className="max-w-sm font-light text-sm leading-relaxed text-charcoal-500">
              Rosie will craft Relaxed, Balanced, and Packed plans tailored to these inputs.
            </div>
            <button
              onClick={onPlan}
              disabled={isPlanning}
              className="border border-charcoal-700 bg-charcoal-700 px-8 py-4 text-[11px] font-medium uppercase tracking-[0.35em] text-cream-50 transition hover:bg-charcoal-600 disabled:opacity-60"
            >
              {isPlanning ? 'Planning…' : 'Generate three plans'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-charcoal-500">{label}</span>
      {children}
    </label>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-charcoal-700/15 bg-cream-50 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-charcoal-600">
      <span className="text-[9px] tracking-[0.3em] text-charcoal-400">{label}</span>
      <span className="font-medium text-charcoal-700">{value}</span>
    </span>
  );
}
