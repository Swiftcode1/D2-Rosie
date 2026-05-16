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

  return (
    <article
      onClick={onActivate}
      className={`relative cursor-pointer rounded-3xl border bg-white p-6 shadow-card transition ${
        active
          ? 'border-rosie-300 ring-2 ring-rosie-200'
          : 'border-cream-200 hover:border-rosie-200'
      }`}
    >
      <div className="absolute inset-x-6 top-0 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-gold-300 via-rosie-300 to-gold-300" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-gold-500">
            {itinerary.track} track
          </div>
          <h3 className="mt-1 font-serif text-2xl text-charcoal-700">{itinerary.title}</h3>
          <p className="text-sm text-charcoal-400">{itinerary.subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-charcoal-400">Total</div>
          <div className="font-serif text-xl text-charcoal-700">
            ${itinerary.totalCost}
          </div>
          <div className="text-xs text-charcoal-400">
            ⏱ {Math.floor(itinerary.totalMinutes / 60)}h {itinerary.totalMinutes % 60}m
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {places.slice(0, 4).map((s) =>
          s.place ? (
            <div
              key={s.place.id}
              className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-50"
            >
              <div
                className="h-24 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${s.place.image})` }}
              />
              <div className="px-2 py-1.5">
                <div className="truncate text-xs font-medium text-charcoal-600">{s.place.name}</div>
                <div className="truncate text-[10px] uppercase tracking-wider text-charcoal-400">
                  {s.place.category}
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>

      <div className="mt-6">
        <Timeline stops={itinerary.stops} />
      </div>

      <div className="mt-6">
        <MapPreview itinerary={itinerary} transportation={transportation} />
      </div>

      <div className="mt-6 rounded-2xl border border-rosie-100 bg-rosie-50/40 p-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-rosie-600">Why Rosie chose this</div>
        <div className="mt-1 text-sm text-charcoal-600">{itinerary.explanation}</div>
        {itinerary.warnings.length > 0 && (
          <div className="mt-2 text-xs text-rosie-600">⚠ {itinerary.warnings.join(' ')}</div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-500">
          <span>🔁 Return buffer: {itinerary.returnBufferMinutes} min</span>
          <span>📍 {places.length} stops</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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
      className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wider transition ${cls}`}
    >
      {children}
    </button>
  );
}
