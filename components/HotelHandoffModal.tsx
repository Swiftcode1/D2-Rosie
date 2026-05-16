'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { GuestProfile, Itinerary } from '@/types';
import { HOTEL } from '@/data/places';
import { appendItineraryHistory } from '@/lib/profileStorage';

export type HandoffAction = 'reserve' | 'frontDesk' | 'save' | 'qr' | 'maps';

interface Props {
  action: HandoffAction;
  itinerary: Itinerary;
  profile: GuestProfile;
  onClose: () => void;
}

export default function HotelHandoffModal({ action, itinerary, profile, onClose }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (action === 'save') {
      appendItineraryHistory({
        id: `itin-${Date.now()}`,
        createdAt: new Date().toISOString(),
        track: itinerary.track,
        request: itinerary.subtitle,
        totalCost: itinerary.totalCost,
        totalMinutes: itinerary.totalMinutes,
        stopCount: itinerary.stops.filter((s) => s.kind === 'place' || s.kind === 'meal').length
      });
      setConfirmed(true);
    }
  }, [action, itinerary]);

  const title: Record<HandoffAction, string> = {
    reserve: 'Reserve / Book stops',
    frontDesk: 'Front desk concierge request',
    save: 'Itinerary saved',
    qr: 'Share itinerary by QR',
    maps: 'Open in maps'
  };

  const stops = itinerary.stops.filter((s) => s.place);

  const mapsUrl = (() => {
    const origin = encodeURIComponent(HOTEL.address);
    const waypoints = stops
      .map((s) => s.place && encodeURIComponent(s.place.address))
      .filter(Boolean)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${origin}&waypoints=${waypoints}`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal-700/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden border border-charcoal-700/15 bg-cream-50 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-charcoal-700/10 p-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-gold-400">
              <span className="inline-block h-px w-6 bg-gold-300" />
              Rosewood
            </div>
            <h3 className="mt-3 font-serif text-2xl italic text-charcoal-700">{title[action]}</h3>
          </div>
          <button
            onClick={onClose}
            className="border border-charcoal-700/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-charcoal-500 transition hover:border-charcoal-700/60 hover:text-charcoal-700"
          >
            Close
          </button>
        </div>

        <div className="px-6 pb-6">
          {action === 'reserve' && (
            <div className="space-y-3 text-sm text-charcoal-600">
              <p>
                Rosie will request bookings for the stops below. The front desk will confirm
                availability and reply to your room.
              </p>
              <ul className="space-y-1.5 rounded-2xl border border-cream-200 bg-cream-50 p-3">
                {stops.map((s, i) =>
                  s.place ? (
                    <li key={i} className="flex justify-between">
                      <span>{s.place.name}</span>
                      <span className="text-charcoal-400">
                        {s.place.bookingAvailable ? 'Reservation requested' : 'Walk-in'}
                      </span>
                    </li>
                  ) : null
                )}
              </ul>
              <button
                onClick={() => setConfirmed(true)}
                className="w-full border border-charcoal-700 bg-charcoal-700 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.35em] text-cream-50 transition hover:bg-charcoal-600"
              >
                {confirmed ? '✓ Reservation request sent' : 'Send reservation request'}
              </button>
            </div>
          )}

          {action === 'frontDesk' && (
            <div className="space-y-4 text-sm text-charcoal-600">
              <div className="rounded-2xl border border-rosie-100 bg-rosie-50/40 p-4">
                <div className="text-[11px] uppercase tracking-[0.25em] text-rosie-600">
                  Concierge request
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-charcoal-600">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-charcoal-400">Guest</div>
                    <div>{profile.guestName || 'Guest'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-charcoal-400">Room</div>
                    <div>{profile.roomNumber || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-charcoal-400">Itinerary</div>
                    <div>{itinerary.title} · {stops.length} stops · ${itinerary.totalCost}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-charcoal-400">Requested help</div>
                    <div>
                      Confirm reservations where available, arrange rideshare/shuttle, and
                      print a paper copy for the guest.
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setConfirmed(true)}
                className="w-full rounded-full bg-charcoal-700 px-5 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-charcoal-600"
              >
                {confirmed ? '✓ Sent to front desk' : 'Send to front desk'}
              </button>
            </div>
          )}

          {action === 'save' && (
            <div className="space-y-3 text-sm text-charcoal-600">
              <p>Saved to this guest profile and added to itinerary history.</p>
              <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 text-xs text-charcoal-500">
                {itinerary.title} · {stops.length} stops · ${itinerary.totalCost} · {Math.floor(itinerary.totalMinutes / 60)}h
              </div>
            </div>
          )}

          {action === 'qr' && (
            <div className="flex flex-col items-center gap-3 text-sm text-charcoal-600">
              <div className="border border-charcoal-700/15 bg-cream-50 p-5">
                <QRCodeSVG value={mapsUrl} size={180} fgColor="#1f1c18" />
              </div>
              <p className="text-center text-xs text-charcoal-400">
                Scan to open this itinerary in maps on the guest’s phone.
              </p>
            </div>
          )}

          {action === 'maps' && (
            <div className="space-y-3 text-sm text-charcoal-600">
              <p>Opens this multi-stop route in Google Maps.</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full bg-rosie-500 px-5 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-rosie-600"
              >
                Open route in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
