'use client';

import { useEffect, useState } from 'react';
import type { GuestProfile, Itinerary, TravelStyle } from '@/types';
import ItineraryCard from './ItineraryCard';

interface Props {
  itineraries: Itinerary[];
  profile: GuestProfile;
  transportation: string;
}

const TRACK_LABEL: Record<TravelStyle, string> = {
  relaxed: 'Relaxed',
  balanced: 'Balanced',
  ambitious: 'Ambitious'
};

const TRACK_SUBLABEL: Record<TravelStyle, string> = {
  relaxed: 'Fewer stops · easier pace',
  balanced: 'Rosie’s default',
  ambitious: 'More to see · tighter timing'
};

export default function ItineraryResults({ itineraries, profile, transportation }: Props) {
  const ordered: Itinerary[] = (['balanced', 'relaxed', 'ambitious'] as TravelStyle[])
    .map((t) => itineraries.find((i) => i.track === t))
    .filter((i): i is Itinerary => Boolean(i));

  const [active, setActive] = useState<TravelStyle>(ordered[0]?.track || 'balanced');

  useEffect(() => {
    if (ordered.length && !ordered.find((i) => i.track === active)) {
      setActive(ordered[0].track);
    }
  }, [itineraries, ordered, active]);

  if (!ordered.length) return null;

  const activePlan = ordered.find((i) => i.track === active) || ordered[0];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-8 pt-24 sm:px-14 sm:pt-28">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="eyebrow">Today’s Itinerary</div>
            <h2 className="mt-5 font-serif text-5xl font-light leading-[1.05] text-[color:var(--ink)] sm:text-6xl">
              The plan, on your terms
            </h2>
            <p className="mt-6 max-w-md text-base font-light leading-relaxed text-[color:var(--ink-soft)]">
              Switch between three intensities at any time. The card refreshes in place — nothing to
              scroll through.
            </p>
          </div>
        </div>

        <div role="tablist" className="mt-12 flex flex-wrap gap-x-12 gap-y-4 border-b border-[color:var(--line)] pb-1">
          {ordered.map((it) => (
            <button
              key={it.track}
              role="tab"
              aria-selected={active === it.track}
              onClick={() => setActive(it.track)}
              className={`group -mb-px flex flex-col items-start pb-4 transition ${
                active === it.track ? '' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <span
                className={`font-serif text-2xl font-light text-[color:var(--ink)] sm:text-3xl ${
                  active === it.track ? '' : ''
                }`}
              >
                {TRACK_LABEL[it.track]}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                {TRACK_SUBLABEL[it.track]}
              </span>
              <span
                className={`mt-3 h-px w-full transition ${
                  active === it.track ? 'bg-[color:var(--ink)]' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[color:var(--line)]">
        <ItineraryCard
          key={activePlan.track}
          itinerary={activePlan}
          profile={profile}
          transportation={transportation}
          active
          onActivate={() => {}}
        />
      </div>
    </section>
  );
}
