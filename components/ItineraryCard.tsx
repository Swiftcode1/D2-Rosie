'use client';

import { useState } from 'react';
import type { GuestProfile, Itinerary, PriceLevel } from '@/types';
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
  const featured = [...places].sort(
    (a, b) => (b.place?.rating ?? 0) - (a.place?.rating ?? 0)
  )[0]?.place;
  const avgRating = places.length
    ? places.reduce((sum, s) => sum + (s.place?.rating ?? 0), 0) / places.length
    : 0;

  return (
    <article
      onClick={onActivate}
      className={`group relative cursor-pointer overflow-hidden border bg-cream-50 transition ${
        active
          ? 'border-charcoal-700 shadow-soft'
          : 'border-charcoal-700/10 hover:border-charcoal-700/40 hover:shadow-card'
      }`}
    >
      {featured && (
        <div className="relative h-72 w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-[1200ms] group-hover:scale-105"
            style={{ backgroundImage: `url(${featured.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal-700/30 via-charcoal-700/20 to-charcoal-700/90" />

          <div className="absolute left-5 top-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cream-50">
            <span className="inline-block h-px w-6 bg-gold-300" />
            {itinerary.track} track
          </div>

          {avgRating > 0 && (
            <div className="absolute right-5 top-5 flex items-center gap-1.5 border border-cream-50/30 bg-charcoal-700/60 px-3 py-1.5 text-xs font-medium text-cream-50 backdrop-blur">
              <span className="text-gold-200">★</span>
              <span className="tracking-wider">{avgRating.toFixed(1)}</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-cream-50/70">avg</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 px-6 pb-6 text-cream-50">
            <div className="font-serif text-3xl italic leading-tight">{itinerary.title}</div>
            <div className="mt-1 text-sm font-light text-cream-50/85">{itinerary.subtitle}</div>

            <div className="mt-5 flex items-center gap-5 border-t border-cream-50/20 pt-3 text-[10px] uppercase tracking-[0.25em] text-cream-50/85">
              <div>
                <div className="text-[9px] text-cream-50/60">Total</div>
                <div className="mt-0.5 font-serif text-base tracking-normal text-cream-50">
                  ${itinerary.totalCost}
                </div>
              </div>
              <div className="h-8 w-px bg-cream-50/20" />
              <div>
                <div className="text-[9px] text-cream-50/60">Duration</div>
                <div className="mt-0.5 font-serif text-base tracking-normal text-cream-50">
                  {Math.floor(itinerary.totalMinutes / 60)}h {itinerary.totalMinutes % 60}m
                </div>
              </div>
              <div className="h-8 w-px bg-cream-50/20" />
              <div>
                <div className="text-[9px] text-cream-50/60">Stops</div>
                <div className="mt-0.5 font-serif text-base tracking-normal text-cream-50">
                  {places.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between border-b border-charcoal-700/10 pb-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-400">
            <span className="inline-block h-px w-6 bg-gold-300" />
            Featured stops
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-charcoal-400">
            {places.length} curated picks
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {places.slice(0, 4).map((s, i) =>
            s.place ? (
              <div
                key={s.place.id}
                className="group/tile relative overflow-hidden border border-charcoal-700/10 bg-white transition hover:border-charcoal-700/40"
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-[900ms] group-hover/tile:scale-110"
                    style={{ backgroundImage: `url(${s.place.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-700/90 via-charcoal-700/20 to-transparent" />

                  {typeof s.place.rating === 'number' && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 border border-cream-50/30 bg-charcoal-700/65 px-2 py-1 text-[11px] font-medium text-cream-50 backdrop-blur">
                      <span className="text-gold-200">★</span>
                      <span>{s.place.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 bg-cream-50/95 px-2 py-1 text-[9px] uppercase tracking-[0.3em] text-charcoal-700">
                    No. {i + 1}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-6">
                    <div className="text-[9px] uppercase tracking-[0.3em] text-cream-50/80">
                      {s.place.category}
                    </div>
                    <div className="mt-1 line-clamp-2 font-serif text-base leading-tight text-cream-50">
                      {s.place.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-charcoal-700/10 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-charcoal-500">
                    <span className="font-mono font-medium text-charcoal-700">{s.time}</span>
                    <span className="text-charcoal-300">·</span>
                    <span>{s.place.estimatedDurationMinutes}m</span>
                  </div>
                  <PriceTag level={s.place.priceLevel} cost={s.place.estimatedCost} />
                </div>

                {s.place.reviewSignals && s.place.reviewSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pb-3">
                    {s.place.reviewSignals.slice(0, 2).map((sig) => (
                      <span
                        key={sig}
                        className="border border-charcoal-700/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-charcoal-500"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-400">
            <span className="inline-block h-px w-6 bg-gold-300" />
            The itinerary
          </div>
          <div className="mt-4">
            <Timeline stops={itinerary.stops} />
          </div>
        </div>

        <div className="mt-8">
          <MapPreview itinerary={itinerary} transportation={transportation} />
        </div>

        <div className="mt-8 border-l-2 border-rosie-500 bg-cream-100/60 p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-rosie-500">
            Why Rosie chose this
          </div>
          <div className="mt-2 font-serif text-base italic leading-relaxed text-charcoal-600">
            {itinerary.explanation}
          </div>
          {itinerary.warnings.length > 0 && (
            <div className="mt-3 text-xs italic text-rosie-500">⚠ {itinerary.warnings.join(' ')}</div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 border-t border-charcoal-700/10 pt-3 text-[10px] uppercase tracking-[0.2em] text-charcoal-400">
            <span>Return buffer · {itinerary.returnBufferMinutes} min</span>
            <span>{places.length} stops</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-charcoal-700/10 pt-6">
          <ActionBtn onClick={() => setModal('reserve')} tone="primary">
            Reserve / Book
          </ActionBtn>
          <ActionBtn onClick={() => setModal('frontDesk')}>Send to front desk</ActionBtn>
          <ActionBtn onClick={() => setModal('save')}>Save itinerary</ActionBtn>
          <ActionBtn onClick={() => setModal('qr')}>Share QR</ActionBtn>
          <ActionBtn onClick={() => setModal('maps')}>Open in maps</ActionBtn>
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

function PriceTag({ level, cost }: { level: PriceLevel; cost: number }) {
  if (level === 'free' || cost === 0) {
    return (
      <span className="border border-gold-300 px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] text-gold-400">
        Complimentary
      </span>
    );
  }
  const dollars = level === 'premium' ? '$$$' : level === 'medium' ? '$$' : '$';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-charcoal-600">
      <span className="text-gold-400">{dollars}</span>
      <span className="font-mono font-medium text-charcoal-700">${cost}</span>
    </span>
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
      ? 'border border-charcoal-700 bg-charcoal-700 text-cream-50 hover:bg-charcoal-600'
      : 'border border-charcoal-700/20 bg-transparent text-charcoal-600 hover:border-charcoal-700/60 hover:text-charcoal-700';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.3em] transition ${cls}`}
    >
      {children}
    </button>
  );
}
