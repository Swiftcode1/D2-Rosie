'use client';

import type { ItineraryStop } from '@/types';

export default function Timeline({ stops }: { stops: ItineraryStop[] }) {
  return (
    <ol className="relative space-y-4 border-l border-rosie-100 pl-6">
      {stops.map((s, i) => {
        const isHotel = s.kind === 'hotel';
        const isTravel = s.kind === 'travel';
        const isMeal = s.kind === 'meal';
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[31px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                isHotel
                  ? 'bg-gold-300 text-charcoal-700'
                  : isTravel
                    ? 'bg-cream-200 text-charcoal-500'
                    : isMeal
                      ? 'bg-rosie-500 text-white'
                      : 'bg-rosie-300 text-white'
              }`}
            >
              <span className="text-[10px] font-semibold">
                {isHotel ? '★' : isTravel ? '→' : isMeal ? '🍽' : i}
              </span>
            </span>
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-xs uppercase tracking-wider text-charcoal-400">
                {s.time}
              </div>
              <div className="font-serif text-lg text-charcoal-700">{s.label}</div>
            </div>
            {(s.durationMinutes > 0 || s.costEstimate || s.travelMinutesFromPrev) && (
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-charcoal-500">
                {s.durationMinutes > 0 && !isTravel && (
                  <span>⏱ {s.durationMinutes} min</span>
                )}
                {s.travelMinutesFromPrev && <span>🚗 {s.travelMinutesFromPrev} min travel</span>}
                {s.costEstimate ? <span>💲 ${s.costEstimate}</span> : null}
                {s.place?.distanceMilesFromHotel ? (
                  <span>📍 {s.place.distanceMilesFromHotel} mi from hotel</span>
                ) : null}
              </div>
            )}
            {s.reason && (
              <div className="mt-1.5 text-sm italic text-charcoal-400">{s.reason}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
