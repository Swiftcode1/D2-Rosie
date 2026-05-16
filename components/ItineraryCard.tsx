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
      className={`relative cursor-pointer overflow-hidden rounded-3xl border bg-white shadow-card transition ${
        active
          ? 'border-rosie-300 ring-2 ring-rosie-200'
          : 'border-cream-200 hover:border-rosie-200'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-rosie-300 to-gold-300" />

      {heroPlace && (
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroPlace.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-700/70 via-charcoal-700/10 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8 text-white">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cream-100/90">
              {itinerary.track} track
            </div>
            <h3 className="mt-2 font-serif text-4xl">{itinerary.title}</h3>
            <p className="mt-1 text-base text-cream-100/90">{itinerary.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream-100/90">
              <span>💲 ${itinerary.totalCost} total</span>
              <span>
                ⏱ {Math.floor(itinerary.totalMinutes / 60)}h {itinerary.totalMinutes % 60}m
              </span>
              <span>📍 {places.length} stops</span>
              <span>🔁 {itinerary.returnBufferMinutes} min return buffer</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500">Timeline</div>
          <div className="mt-5">
            <Timeline stops={itinerary.stops} />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold-500">Stops</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {places.slice(0, 4).map((s) =>
                s.place ? (
                  <div
                    key={s.place.id}
                    className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-50"
                  >
                    <div
                      className="h-28 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${s.place.image})` }}
                    />
                    <div className="px-3 py-2">
                      <div className="truncate text-sm font-medium text-charcoal-600">
                        {s.place.name}
                      </div>
                      <div className="truncate text-[10px] uppercase tracking-wider text-charcoal-400">
                        {s.place.category}
                      </div>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          <MapPreview itinerary={itinerary} transportation={transportation} />

          <div className="rounded-2xl border border-rosie-100 bg-rosie-50/40 p-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-rosie-600">
              Why Rosie chose this
            </div>
            <div className="mt-3 text-base leading-relaxed text-charcoal-600">
              {itinerary.explanation}
            </div>
            {itinerary.warnings.length > 0 && (
              <div className="mt-3 text-xs text-rosie-600">⚠ {itinerary.warnings.join(' ')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-cream-200 bg-cream-50/60 px-8 py-5 sm:px-12">
        <ActionBtn onClick={() => setModal('reserve')} tone="primary">
          Reserve / Book
        </ActionBtn>
        <ActionBtn onClick={() => setModal('frontDesk')}>Send to front desk</ActionBtn>
        <ActionBtn onClick={() => setModal('save')}>Save itinerary</ActionBtn>
        <ActionBtn onClick={() => setModal('qr')}>Share QR</ActionBtn>
        <ActionBtn onClick={() => setModal('maps')}>Open in maps</ActionBtn>
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

function ActionBtn({
  onClick,
  children,
  tone
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'primary';
}) {
  const cls =
    tone === 'primary'
      ? 'bg-rosie-500 text-white hover:bg-rosie-600'
      : 'border border-cream-200 bg-white text-charcoal-600 hover:bg-cream-50';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition ${cls}`}
    >
      {children}
    </button>
  );
}
