'use client';

import type { ItineraryStop } from '@/types';

export default function Timeline({ stops }: { stops: ItineraryStop[] }) {
  return (
    <ol className="relative space-y-6 border-l border-rosie-100 pl-8">
      {stops.map((s, i) => {
        const isHotel = s.kind === 'hotel';
        const isTravel = s.kind === 'travel';
        const isMeal = s.kind === 'meal';
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[39px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                isHotel
                  ? 'bg-gold-300 text-charcoal-700'
                  : isTravel
                    ? 'bg-cream-200 text-charcoal-500'
                    : isMeal
                      ? 'bg-rosie-500 text-white'
                      : 'bg-rosie-300 text-white'
              }`}
            >
              <span className="text-[11px] font-semibold">
                {isHotel ? '★' : isTravel ? '→' : isMeal ? '🍽' : i}
              </span>
            </span>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <div className="font-mono text-xs uppercase tracking-wider text-charcoal-400">
                {s.time}
              </div>
              <div className="font-serif text-xl text-charcoal-700">{s.label}</div>
            </div>
            {(s.durationMinutes > 0 || s.costEstimate || s.travelMinutesFromPrev) && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-500">
                {s.durationMinutes > 0 && !isTravel && (
                  <span>⏱ {s.durationMinutes} min</span>
                )}
                {s.travelMinutesFromPrev && <span>🚗 {s.travelMinutesFromPrev} min travel</span>}
                {s.costEstimate ? <span>💲 ${s.costEstimate}</span> : null}
              </div>
            )}
            {s.reason && (
              <div className="mt-2 text-sm italic leading-relaxed text-charcoal-400">
                {s.reason}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
