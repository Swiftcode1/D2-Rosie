'use client';

import { useState } from 'react';
import type { GuestProfile, Itinerary } from '@/types';
import Timeline from './Timeline';
import MapPreview from './MapPreview';
import HotelHandoffModal, { HandoffAction } from './HotelHandoffModal';

interface Props {
  itinerary: Itinerary;
  profile: GuestProfile;
  transportation: string;
  active: boolean;
  onActivate: () => void;
}

export default function ItineraryCard({
  itinerary,
  profile,
  transportation,
  active,
  onActivate
}: Props) {
  const [modal, setModal] = useState<HandoffAction | null>(null);
  const places = itinerary.stops.filter((s) => s.place && (s.kind === 'place' || s.kind === 'meal'));
  const heroPlace = places[0]?.place;

  return (
    <article
      onClick={onActivate}
      className={`relative cursor-pointer bg-white transition ${
        active ? 'opacity-100' : 'opacity-95 hover:opacity-100'
      }`}
    >
      {heroPlace && (
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-[color:var(--ink)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroPlace.image})` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" aria-hidden />
          <div className="relative flex h-full flex-col justify-end p-10 text-white sm:p-16">
            <div className="text-[11px] uppercase tracking-[0.4em] text-white/80">
              The {itinerary.track} Plan
            </div>
            <h3 className="mt-5 font-serif text-5xl font-light leading-[1.05] tracking-wide sm:text-6xl">
              {itinerary.title}
            </h3>
            <p className="mt-4 max-w-xl text-base font-light text-white/85">{itinerary.subtitle}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-8 py-20 sm:px-14 sm:py-24">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-4">
          <Stat label="Total" value={`$${itinerary.totalCost}`} />
          <Stat
            label="Duration"
            value={`${Math.floor(itinerary.totalMinutes / 60)}h ${itinerary.totalMinutes % 60}m`}
          />
          <Stat label="Stops" value={`${places.length}`} />
          <Stat label="Return buffer" value={`${itinerary.returnBufferMinutes} min`} />
        </div>

        <div className="my-16 hairline" />

        <div className="grid gap-x-20 gap-y-16 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <div className="eyebrow">The Day</div>
            <h4 className="mt-4 font-serif text-3xl font-light leading-snug text-[color:var(--ink)]">
              A considered sequence
            </h4>
            <div className="mt-10">
              <Timeline stops={itinerary.stops} />
            </div>
          </div>

          <div className="space-y-14">
            <div>
              <div className="eyebrow">Selected stops</div>
              <div className="mt-6 grid grid-cols-2 gap-5">
                {places.slice(0, 4).map((s) =>
                  s.place ? (
                    <figure key={s.place.id} className="space-y-3">
                      <div
                        className="aspect-[4/3] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${s.place.image})` }}
                      />
                      <figcaption>
                        <div className="font-serif text-lg leading-tight text-[color:var(--ink)]">
                          {s.place.name}
                        </div>
                        <div className="eyebrow mt-1.5">{s.place.category}</div>
                      </figcaption>
                    </figure>
                  ) : null
                )}
              </div>
            </div>

            <MapPreview itinerary={itinerary} transportation={transportation} />

            <div>
              <div className="eyebrow">Rosie’s reasoning</div>
              <p className="mt-5 font-serif text-xl font-light leading-relaxed text-[color:var(--ink)]">
                {itinerary.explanation}
              </p>
              {itinerary.warnings.length > 0 && (
                <p className="mt-4 text-sm leading-relaxed text-[color:var(--gold)]">
                  Note · {itinerary.warnings.join(' ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 hairline" />

        <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4">
          <ActionBtn onClick={() => setModal('reserve')}>Reserve</ActionBtn>
          <ActionBtn onClick={() => setModal('frontDesk')}>Send to Front Desk</ActionBtn>
          <ActionBtn onClick={() => setModal('save')}>Save Itinerary</ActionBtn>
          <ActionBtn onClick={() => setModal('qr')}>Share QR</ActionBtn>
          <ActionBtn onClick={() => setModal('maps')}>Open in Maps</ActionBtn>
        </div>
      </div>

      {modal && (
        <HotelHandoffModal
          action={modal}
          itinerary={itinerary}
          profile={profile}
          onClose={() => setModal(null)}
        />
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-serif text-4xl font-light text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="cta-link-soft"
    >
      {children}
    </button>
  );
}
