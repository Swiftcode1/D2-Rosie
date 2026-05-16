'use client';

import { useState } from 'react';
import type { GuestProfile, Itinerary } from '@/types';
import ItineraryCard from './ItineraryCard';

interface Props {
  itineraries: Itinerary[];
  profile: GuestProfile;
  transportation: string;
}

export default function ItineraryResults({ itineraries, profile, transportation }: Props) {
  const [active, setActive] = useState<string>(itineraries[1]?.track || itineraries[0]?.track || '');

  if (!itineraries.length) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500">Today’s plans</div>
          <h2 className="mt-1 font-serif text-3xl text-charcoal-700">Three ways to spend the day</h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          {itineraries.map((it) => (
            <button
              key={it.track}
              onClick={() => setActive(it.track)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
                active === it.track
                  ? 'border-rosie-300 bg-rosie-100 text-rosie-700'
                  : 'border-cream-200 bg-white text-charcoal-500 hover:bg-cream-50'
              }`}
            >
              {it.track}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {itineraries.map((it) => (
          <ItineraryCard
            key={it.track}
            itinerary={it}
            profile={profile}
            transportation={transportation}
            active={active === it.track}
            onActivate={() => setActive(it.track)}
          />
        ))}
      </div>
    </section>
  );
}
