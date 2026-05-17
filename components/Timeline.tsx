'use client';

import type { ItineraryStop } from '@/types';

export default function Timeline({ stops }: { stops: ItineraryStop[] }) {
  return (
    <ol className="relative space-y-9 border-l border-[color:var(--line)] pl-10">
      {stops.map((s, i) => {
        const isHotel = s.kind === 'hotel';
        const isTravel = s.kind === 'travel';
        const isMeal = s.kind === 'meal';
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[44px] top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-white ${
                isHotel
                  ? 'bg-[color:var(--gold)]'
                  : isTravel
                    ? 'bg-[color:var(--line)]'
                    : isMeal
                      ? 'bg-[color:var(--ink)]'
                      : 'bg-[color:var(--ink-soft)]'
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-5">
              <div className="eyebrow text-[color:var(--ink-faint)]">{s.time}</div>
              <div className="font-serif text-xl font-light text-[color:var(--ink)]">
                {s.label}
              </div>
            </div>
            {(s.durationMinutes > 0 || s.costEstimate || s.travelMinutesFromPrev) && (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                {s.durationMinutes > 0 && !isTravel && <span>{s.durationMinutes} min</span>}
                {s.travelMinutesFromPrev && <span>{s.travelMinutesFromPrev} min travel</span>}
                {s.costEstimate ? <span>${s.costEstimate}</span> : null}
              </div>
            )}
            {s.reason && (
              <div className="mt-3 text-sm font-light leading-relaxed text-[color:var(--ink-soft)]">
                {s.reason}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
