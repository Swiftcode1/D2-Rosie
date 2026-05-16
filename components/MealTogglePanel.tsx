'use client';

import type { MealStatus } from '@/types';

interface Props {
  status: MealStatus;
  onToggle: (slot: 'breakfast' | 'lunch' | 'dinner') => void;
}

export default function MealTogglePanel({ status, onToggle }: Props) {
  const items: { slot: 'breakfast' | 'lunch' | 'dinner'; label: string; window: string }[] = [
    { slot: 'breakfast', label: 'Breakfast', window: '7:00–10:00 AM' },
    { slot: 'lunch', label: 'Lunch', window: '11:30 AM–2:00 PM' },
    { slot: 'dinner', label: 'Dinner', window: '5:00–8:30 PM' }
  ];

  const anyOverlap = items.some((i) => status[i.slot].overlap);

  return (
    <div className="rounded-2xl border border-rosie-100 bg-rosie-50/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-rosie-600">Meal slots</div>
          <div className="mt-1 text-sm text-charcoal-500">
            {anyOverlap
              ? 'Your window overlaps a meal time — toggle off if you’ve already eaten.'
              : 'No meal overlap detected in this time window.'}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => {
          const s = status[i.slot];
          const active = s.included;
          const dimmed = !s.overlap;
          return (
            <button
              key={i.slot}
              type="button"
              onClick={() => onToggle(i.slot)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? 'border-rosie-300 bg-white text-rosie-700 shadow-sm'
                  : dimmed
                    ? 'border-cream-200 bg-cream-50 text-charcoal-400'
                    : 'border-cream-200 bg-white text-charcoal-500'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  active ? 'bg-rosie-500' : 'bg-cream-200'
                }`}
              />
              Include {i.label.toLowerCase()}
              <span className="text-[10px] text-charcoal-400">{i.window}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
