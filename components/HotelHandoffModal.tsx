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
    reserve: 'Reserve',
    frontDesk: 'Front Desk Concierge',
    save: 'Saved',
    qr: 'Share by QR',
    maps: 'Open in Maps'
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[color:var(--line)] px-10 py-7">
          <div>
            <div className="eyebrow">Rosewood Sand Hill</div>
            <h3 className="mt-2 font-serif text-3xl font-light text-[color:var(--ink)]">
              {title[action]}
            </h3>
          </div>
          <button onClick={onClose} className="cta-link-soft">
            Close
          </button>
        </div>

        <div className="px-10 py-8">
          {action === 'reserve' && (
            <div className="space-y-6">
              <p className="text-sm font-light leading-relaxed text-[color:var(--ink-soft)]">
                Rosie will request reservations for the stops below. The front desk will confirm
                availability and reply to your room.
              </p>
              <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
                {stops.map((s, i) =>
                  s.place ? (
                    <li key={i} className="flex items-center justify-between py-4">
                      <span className="font-serif text-lg text-[color:var(--ink)]">{s.place.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                        {s.place.bookingAvailable ? 'Reservation' : 'Walk-in'}
                      </span>
                    </li>
                  ) : null
                )}
              </ul>
              <button
                onClick={() => setConfirmed(true)}
                className="cta-link"
              >
                {confirmed ? 'Reservation Request Sent' : 'Send Reservation Request'}
              </button>
            </div>
          )}

          {action === 'frontDesk' && (
            <div className="space-y-6">
              <div className="border border-[color:var(--line)] p-6">
                <div className="eyebrow">Concierge Request</div>
                <div className="mt-4 space-y-3">
                  <Row label="Guest" value={profile.guestName || 'Guest'} />
                  <Row label="Room" value={profile.roomNumber || '—'} />
                  <Row
                    label="Itinerary"
                    value={`${itinerary.title} · ${stops.length} stops · $${itinerary.totalCost}`}
                  />
                  <Row
                    label="Requested help"
                    value="Confirm reservations where available, arrange rideshare or shuttle, and print a paper copy for the guest."
                  />
                </div>
              </div>
              <button onClick={() => setConfirmed(true)} className="cta-link">
                {confirmed ? 'Sent to Front Desk' : 'Send to Front Desk'}
              </button>
            </div>
          )}

          {action === 'save' && (
            <div className="space-y-4 text-sm font-light leading-relaxed text-[color:var(--ink-soft)]">
              <p>Saved to your guest profile and added to itinerary history.</p>
              <div className="border border-[color:var(--line)] p-4 text-[color:var(--ink)]">
                {itinerary.title} · {stops.length} stops · ${itinerary.totalCost} ·{' '}
                {Math.floor(itinerary.totalMinutes / 60)}h
              </div>
            </div>
          )}

          {action === 'qr' && (
            <div className="flex flex-col items-center gap-5">
              <div className="border border-[color:var(--line)] bg-white p-5">
                <QRCodeSVG value={mapsUrl} size={180} fgColor="#1a1a1a" />
              </div>
              <p className="text-center text-xs font-light text-[color:var(--ink-soft)]">
                Scan to open this itinerary in maps on the guest’s phone.
              </p>
            </div>
          )}

          {action === 'maps' && (
            <div className="space-y-4">
              <p className="text-sm font-light leading-relaxed text-[color:var(--ink-soft)]">
                Opens this multi-stop route in Google Maps.
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-link"
              >
                Open Route in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4">
      <div className="eyebrow">{label}</div>
      <div className="text-sm font-light text-[color:var(--ink)]">{value}</div>
    </div>
  );
}
