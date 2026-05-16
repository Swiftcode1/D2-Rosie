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

  const hasMapsKey =
    typeof process !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const directionsUrl = (() => {
    const origin = encodeURIComponent(HOTEL.address);
    const waypoints = stops
      .map((s) => s.place && encodeURIComponent(s.place.address))
      .filter(Boolean)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${waypoints}&travelmode=driving`;
  })();

  return (
    <div className="border border-charcoal-700/10 bg-cream-100/40 p-6">
      <div className="flex items-center justify-between border-b border-charcoal-700/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-400">
            <span className="inline-block h-px w-6 bg-gold-300" />
            Route preview
          </div>
          <div className="mt-2 font-serif text-sm italic text-charcoal-500">
            {transportation} · approx. {totalTravel} min driving total
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-charcoal-700/20 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-charcoal-600 transition hover:border-charcoal-700 hover:text-charcoal-700"
        >
          Open in Google Maps
        </a>
      </div>

      <div className="relative mt-6">
        <div
          className="absolute left-4 right-4 top-5 h-px bg-charcoal-700/15"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <MapPin label={HOTEL.name} sub="Depart" tone="hotel" />
          {stops.map((s, i) => (
            <MapPin
              key={i}
              label={s.place?.name || s.label}
              sub={`Stop ${i + 1}`}
              tone={s.kind === 'meal' ? 'meal' : 'stop'}
              index={i + 1}
            />
          ))}
          <MapPin label={HOTEL.name} sub="Return" tone="hotel" />
        </div>
      </div>

      {!hasMapsKey && (
        <div className="mt-5 border-t border-charcoal-700/10 pt-3 text-[10px] uppercase tracking-[0.25em] text-charcoal-400">
          Add <code className="font-mono normal-case tracking-normal text-charcoal-600">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the live embedded map.
        </div>
      )}
    </div>
  );
}

function MapPin({
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
  const bg =
    tone === 'hotel'
      ? 'border-gold-300 bg-gold-100 text-charcoal-700'
      : tone === 'meal'
        ? 'border-rosie-500 bg-rosie-500 text-cream-50'
        : 'border-charcoal-700 bg-cream-50 text-charcoal-700';
  return (
    <div className="relative flex w-24 flex-col items-center text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center border font-serif text-sm ${bg}`}
      >
        {tone === 'hotel' ? '★' : tone === 'meal' ? '◆' : index}
      </div>
      <div className="mt-3 line-clamp-2 font-serif text-xs italic text-charcoal-700">{label}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-charcoal-400">{sub}</div>
    </div>
  );
}
