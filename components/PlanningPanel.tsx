'use client';

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
  const update = (patch: Partial<PlanRequest>) => onChange({ ...request, ...patch });

  const toggleInterest = (i: Interest) => {
    const has = request.interests.includes(i);
    update({
      interests: has ? request.interests.filter((x) => x !== i) : [...request.interests, i]
    });
  };

  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-6 shadow-card">
      <div className="text-xs uppercase tracking-[0.2em] text-gold-500">Planning</div>
      <h3 className="mt-1 font-serif text-2xl text-charcoal-700">Tune your itinerary</h3>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-5">
        <div className="text-xs uppercase tracking-[0.2em] text-charcoal-400">Interests</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((i) => {
            const on = request.interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                  on
                    ? 'border-rosie-300 bg-rosie-100 text-rosie-700'
                    : 'border-cream-200 bg-cream-50 text-charcoal-500 hover:bg-cream-100'
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <MealTogglePanel status={mealStatus} onToggle={onToggleMeal} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-charcoal-400">
          Rosie will generate Relaxed, Balanced, and Packed plans based on these inputs.
        </div>
        <button
          onClick={onPlan}
          disabled={isPlanning}
          className="rounded-full bg-charcoal-700 px-6 py-3 text-sm font-medium uppercase tracking-wider text-cream-50 transition hover:bg-charcoal-600 disabled:opacity-60"
        >
          {isPlanning ? 'Planning…' : 'Generate three plans'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-[0.2em] text-charcoal-400">{label}</span>
      {children}
    </label>
  );
}
