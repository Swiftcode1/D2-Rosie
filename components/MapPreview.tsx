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
    <div className="rounded-2xl border border-cream-200 bg-gradient-to-br from-cream-50 to-cream-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold-500">Route preview</div>
          <div className="mt-0.5 text-sm text-charcoal-500">
            {transportation} · ~{totalTravel} min driving total
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-rosie-200 bg-white px-3 py-1.5 text-xs uppercase tracking-wider text-rosie-600 hover:bg-rosie-50"
        >
          Open in Google Maps
        </a>
      </div>

      <div className="relative mt-5">
        <div
          className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-gold-300 via-rosie-300 to-gold-300"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <MapPin label={HOTEL.name} sub="Start" tone="hotel" />
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
        <div className="mt-4 rounded-xl border border-cream-200 bg-white/70 p-3 text-[11px] uppercase tracking-wider text-charcoal-400">
          Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the live embedded map.
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
      ? 'bg-gold-300 text-charcoal-700'
      : tone === 'meal'
        ? 'bg-rosie-500 text-white'
        : 'bg-white text-rosie-600 border border-rosie-200';
  return (
    <div className="relative flex w-28 flex-col items-center text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold shadow ${bg}`}
      >
        {tone === 'hotel' ? '★' : tone === 'meal' ? '🍽' : index}
      </div>
      <div className="mt-2 text-xs font-medium text-charcoal-600 line-clamp-2">{label}</div>
      <div className="text-[10px] uppercase tracking-wider text-charcoal-400">{sub}</div>
    </div>
  );
}
