'use client';

import type { ItineraryStop } from '@/types';

export default function Timeline({ stops }: { stops: ItineraryStop[] }) {
  return (
    <ol className="relative space-y-5 border-l border-charcoal-700/15 pl-6">
      {stops.map((s, i) => {
        const isHotel = s.kind === 'hotel';
        const isTravel = s.kind === 'travel';
        const isMeal = s.kind === 'meal';
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[29px] top-2 flex h-3.5 w-3.5 items-center justify-center border ring-[3px] ring-cream-50 ${
                isHotel
                  ? 'border-gold-300 bg-gold-100'
                  : isTravel
                    ? 'border-charcoal-700/20 bg-cream-100'
                    : isMeal
                      ? 'border-rosie-500 bg-rosie-500'
                      : 'border-charcoal-700 bg-cream-50'
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-charcoal-400">
                {s.time}
              </div>
              <div className="font-serif text-lg text-charcoal-700">{s.label}</div>
              {typeof s.place?.rating === 'number' && (
                <span className="ml-auto inline-flex items-center gap-1 border border-gold-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-gold-400">
                  <span className="text-gold-300">★</span>
                  {s.place.rating.toFixed(1)}
                </span>
              )}
            </div>
            {(s.durationMinutes > 0 || s.costEstimate || s.travelMinutesFromPrev) && (
              <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-charcoal-400">
                {s.durationMinutes > 0 && !isTravel && (
                  <span>{s.durationMinutes} min</span>
                )}
                {s.travelMinutesFromPrev && <span>{s.travelMinutesFromPrev} min travel</span>}
                {s.costEstimate ? <span>${s.costEstimate}</span> : null}
                {s.place?.distanceMilesFromHotel ? (
                  <span>{s.place.distanceMilesFromHotel} mi from hotel</span>
                ) : null}
              </div>
            )}
            {s.reason && (
              <div className="mt-2 font-serif text-sm italic text-charcoal-500">{s.reason}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
