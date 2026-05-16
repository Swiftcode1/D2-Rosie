'use client';

import { useEffect, useState } from 'react';
import type { GuestProfile, Itinerary } from '@/types';
import ItineraryCard from './ItineraryCard';

interface Props {
  itineraries: Itinerary[];
  profile: GuestProfile;
  transportation: string;
  guestRequest?: string;
  planVersion?: number;
}

export default function ItineraryResults({
  itineraries,
  profile,
  transportation,
  guestRequest,
  planVersion
}: Props) {
  const [active, setActive] = useState<string>(
    itineraries[1]?.track || itineraries[0]?.track || ''
  );
  const [justRefreshed, setJustRefreshed] = useState(false);

  // Play a brief refresh accent each time a new plan is generated so the
  // section visibly responds to the latest request. Preserve the user's
  // selected track if it still exists in the new set — auto-regen on typing
  // shouldn't clobber their pick.
  useEffect(() => {
    setActive((curr) =>
      curr && itineraries.some((it) => it.track === curr)
        ? curr
        : itineraries[1]?.track || itineraries[0]?.track || ''
    );
    setJustRefreshed(true);
    const t = setTimeout(() => setJustRefreshed(false), 1200);
    return () => clearTimeout(t);
  }, [planVersion, itineraries]);

  if (!itineraries.length) return null;

  return (
    <section className="space-y-8">
      <div className="border-y border-charcoal-700/10 py-8 text-center">
        <div className="flex items-center justify-center gap-3 text-gold-400">
          <span className="inline-block h-px w-10 bg-gold-300" />
          <span className="text-[10px] uppercase tracking-[0.4em]">The Day Ahead</span>
          <span className="inline-block h-px w-10 bg-gold-300" />
        </div>
        <h2 className="mt-4 font-serif text-4xl text-charcoal-700 sm:text-5xl">
          Three ways to spend the day
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-serif text-base italic text-charcoal-500">
          Each itinerary is hand-curated to your pace, palate, and the season.
        </p>

        {guestRequest && (
          <div
            className={`mx-auto mt-6 max-w-2xl border-l-2 border-rosie-500 bg-cream-100/50 px-5 py-4 text-left transition-opacity duration-700 ${
              justRefreshed ? 'opacity-100' : 'opacity-90'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.35em] text-rosie-500">
                In response to
              </div>
              {typeof planVersion === 'number' && planVersion > 0 && (
                <div className="text-[9px] uppercase tracking-[0.3em] text-charcoal-400">
                  Plan no. {planVersion}
                </div>
              )}
            </div>
            <div className="mt-2 font-serif text-base italic leading-snug text-charcoal-700">
              "{guestRequest}"
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {itineraries.map((it) => (
            <button
              key={it.track}
              onClick={() => setActive(it.track)}
              className={`border px-5 py-2 text-[10px] uppercase tracking-[0.3em] transition ${
                active === it.track
                  ? 'border-charcoal-700 bg-charcoal-700 text-cream-50'
                  : 'border-charcoal-700/20 bg-transparent text-charcoal-500 hover:border-charcoal-700/60 hover:text-charcoal-700'
              }`}
            >
              {it.track}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-8 transition-opacity duration-500 lg:grid-cols-3 ${
          justRefreshed ? 'animate-[fadeIn_500ms_ease-out]' : ''
        }`}
      >
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
