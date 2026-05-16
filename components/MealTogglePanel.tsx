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
    <div className="border-l-2 border-rosie-500 bg-cream-100/50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-rosie-500">Meal slots</div>
          <div className="mt-2 font-serif text-sm italic text-charcoal-600">
            {anyOverlap
              ? 'Your window overlaps a meal time — toggle off if you have already dined.'
              : 'No meal overlap detected in this time window.'}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((i) => {
          const s = status[i.slot];
          const active = s.included;
          const dimmed = !s.overlap;
          return (
            <button
              key={i.slot}
              type="button"
              onClick={() => onToggle(i.slot)}
              className={`flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] transition ${
                active
                  ? 'border-charcoal-700 bg-charcoal-700 text-cream-50'
                  : dimmed
                    ? 'border-charcoal-700/15 bg-transparent text-charcoal-400'
                    : 'border-charcoal-700/20 bg-transparent text-charcoal-600 hover:border-charcoal-700/60'
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 ${active ? 'bg-gold-200' : 'bg-charcoal-700/30'}`}
              />
              {i.label}
              <span className="text-[9px] tracking-[0.15em] opacity-70">{i.window}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
