'use client';

import { HOTEL } from '@/data/places';
import type { Itinerary } from '@/types';

interface Props {
  itinerary: Itinerary;
  transportation: string;
}

export default function MapPreview({ itinerary, transportation }: Props) {
  const stops = itinerary.stops.filter((s) => s.kind === 'place' || s.kind === 'meal');
  const totalTravel = itinerary.stops
    .filter((s) => s.kind === 'travel')
    .reduce((sum, s) => sum + (s.travelMinutesFromPrev || 0), 0);

  const directionsUrl = (() => {
    const origin = encodeURIComponent(HOTEL.address);
    const waypoints = stops
      .map((s) => s.place && encodeURIComponent(s.place.address))
      .filter(Boolean)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${waypoints}&travelmode=driving`;
  })();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Route</div>
          <div className="mt-2 font-serif text-2xl font-light text-[color:var(--ink)]">
            {transportation} · ~{totalTravel} min en route
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-link-soft"
          onClick={(e) => e.stopPropagation()}
        >
          Open in Maps
        </a>
      </div>

      <div className="mt-6 border border-[color:var(--line)] bg-[color:var(--paper-tint)] p-6">
        <div className="relative">
          <div
            className="absolute left-3 right-3 top-[18px] h-px bg-[color:var(--line)]"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-2">
            <Pin label={HOTEL.name} sub="Departure" tone="hotel" />
            {stops.map((s, i) => (
              <Pin
                key={i}
                label={s.place?.name || s.label}
                sub={`Stop ${i + 1}`}
                tone={s.kind === 'meal' ? 'meal' : 'stop'}
                index={i + 1}
              />
            ))}
            <Pin label={HOTEL.name} sub="Return" tone="hotel" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Pin({
  label,
  sub,
  tone,
  index
}: {
  label: string;
  sub: string;
  tone: 'hotel' | 'stop' | 'meal';
  index?: number;
}) {
  const dot =
    tone === 'hotel'
      ? 'border-[color:var(--gold)] bg-white text-[color:var(--gold)]'
      : tone === 'meal'
        ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-white'
        : 'border-[color:var(--ink)] bg-white text-[color:var(--ink)]';
  return (
    <div className="relative flex w-24 flex-col items-center text-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-medium ${dot}`}
      >
        {tone === 'hotel' ? '★' : tone === 'meal' ? '·' : index}
      </div>
      <div className="mt-3 line-clamp-2 text-[11px] font-medium text-[color:var(--ink)]">{label}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
        {sub}
      </div>
    </div>
  );
}
