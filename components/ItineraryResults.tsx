'use client';

import { useState } from 'react';
import type { GuestProfile, Itinerary, TravelStyle } from '@/types';
import ItineraryCard from './ItineraryCard';

interface Props {
  itineraries: Itinerary[];
  profile: GuestProfile;
  transportation: string;
}

export default function ItineraryResults({ itineraries, profile, transportation }: Props) {
  const [active, setActive] = useState<TravelStyle>(
    (itineraries[1]?.track || itineraries[0]?.track) as TravelStyle
  );

  if (!itineraries.length) return null;

  const jumpTo = (track: TravelStyle) => {
    setActive(track);
    if (typeof document !== 'undefined') {
      document.getElementById(`plan-${track}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold-500">Today’s plans</div>
          <h2 className="mt-2 font-serif text-4xl text-charcoal-700">
            Three ways to spend the day
          </h2>
          <p className="mt-2 text-base text-charcoal-400">
            Compare side-by-side, then send your pick to the front desk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {itineraries.map((it) => (
            <button
              key={it.track}
              onClick={() => jumpTo(it.track)}
              className={`rounded-full border px-5 py-2 text-xs uppercase tracking-[0.2em] transition ${
                active === it.track
                  ? 'border-rosie-300 bg-rosie-100 text-rosie-700 shadow-sm'
                  : 'border-cream-200 bg-white text-charcoal-500 hover:bg-cream-50'
              }`}
            >
              {it.track}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {itineraries.map((it) => (
          <div key={it.track} id={`plan-${it.track}`} className="scroll-mt-8">
            <ItineraryCard
              itinerary={it}
              profile={profile}
              transportation={transportation}
              active={active === it.track}
              onActivate={() => setActive(it.track)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
