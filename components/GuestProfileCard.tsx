'use client';

import { useState } from 'react';
import type { GuestProfile, Interest } from '@/types';
import { clearProfile, saveProfile, loadProfile } from '@/lib/profileStorage';

const INTERESTS: Interest[] = [
  'food',
  'outdoors',
  'shopping',
  'art',
  'family-friendly',
  'luxury',
  'nightlife',
  'wellness',
  'tech',
  'scenic'
];

interface Props {
  profile: GuestProfile;
  onChange: (p: GuestProfile) => void;
}

export default function GuestProfileCard({ profile, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<GuestProfile>) => onChange({ ...profile, ...patch });

  const toggleInterest = (i: Interest) => {
    const has = profile.interests.includes(i);
    update({
      interests: has ? profile.interests.filter((x) => x !== i) : [...profile.interests, i]
    });
  };

  return (
    <section className="border border-charcoal-700/10 bg-cream-50 shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-8 py-6 text-left transition hover:bg-cream-100/40"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold-400">
            <span className="inline-block h-px w-6 bg-gold-300" />
            Guest profile
          </div>
          <h3 className="mt-2 font-serif text-2xl italic text-charcoal-700 sm:text-3xl">
            In residence with us
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] uppercase tracking-[0.25em] text-charcoal-500">
            <span>
              <span className="text-charcoal-400">Guest · </span>
              {profile.guestName || '—'}
            </span>
            <span>
              <span className="text-charcoal-400">Room · </span>
              {profile.roomNumber || '—'}
            </span>
            <span>
              <span className="text-charcoal-400">Style · </span>
              {profile.travelStyle}
            </span>
            <span>
              <span className="text-charcoal-400">Budget · </span>
              {profile.budgetPreference}
            </span>
            {profile.interests.length > 0 && (
              <span>
                <span className="text-charcoal-400">Interests · </span>
                {profile.interests.slice(0, 3).join(', ')}
                {profile.interests.length > 3 ? `, +${profile.interests.length - 3}` : ''}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 border border-charcoal-700/20 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-charcoal-600 transition ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="border-t border-charcoal-700/10 px-8 pb-8 pt-6">
          <div className="flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                saveProfile(profile);
              }}
              className="border border-charcoal-700 bg-charcoal-700 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-cream-50 transition hover:bg-charcoal-600"
            >
              Save
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(loadProfile());
              }}
              className="border border-charcoal-700/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-charcoal-500 transition hover:border-charcoal-700/60 hover:text-charcoal-700"
            >
              Load
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearProfile();
                onChange(loadProfile());
              }}
              className="border border-charcoal-700/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-charcoal-400 transition hover:border-charcoal-700/60 hover:text-charcoal-700"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Guest name">
              <input
                value={profile.guestName}
                onChange={(e) => update({ guestName: e.target.value })}
                placeholder="e.g. Ms. Chen"
                className="input"
              />
            </Field>
            <Field label="Room">
              <input
                value={profile.roomNumber}
                onChange={(e) => update({ roomNumber: e.target.value })}
                placeholder="e.g. Villa 5"
                className="input"
              />
            </Field>
            <Field label="Travel style">
              <select
                value={profile.travelStyle}
                onChange={(e) => update({ travelStyle: e.target.value as any })}
                className="input"
              >
                <option value="relaxed">Relaxed</option>
                <option value="balanced">Balanced</option>
                <option value="packed">Packed</option>
              </select>
            </Field>
            <Field label="Budget preference">
              <select
                value={profile.budgetPreference}
                onChange={(e) => update({ budgetPreference: e.target.value as any })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="premium">Premium</option>
              </select>
            </Field>
            <Field label="Transportation">
              <select
                value={profile.transportation}
                onChange={(e) => update({ transportation: e.target.value as any })}
                className="input"
              >
                <option value="walking">Walking</option>
                <option value="rideshare">Rideshare</option>
                <option value="driving">Driving</option>
                <option value="hotel shuttle">Hotel shuttle</option>
              </select>
            </Field>
            <Field label="Dietary preference">
              <input
                value={profile.dietaryPreference}
                onChange={(e) => update({ dietaryPreference: e.target.value })}
                placeholder="e.g. vegetarian, gluten-free"
                className="input"
              />
            </Field>
          </div>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.35em] text-charcoal-500">Interests</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = profile.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] transition ${
                      on
                        ? 'border-charcoal-700 bg-charcoal-700 text-cream-50'
                        : 'border-charcoal-700/20 bg-transparent text-charcoal-500 hover:border-charcoal-700/60 hover:text-charcoal-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-charcoal-700/10 pt-5">
            <div>
              <div className="font-serif text-base italic text-charcoal-700">Low walking preference</div>
              <div className="mt-1 text-xs font-light text-charcoal-500">
                Rosie will favour rideshare or shuttle-friendly stops.
              </div>
            </div>
            <button
              type="button"
              onClick={() => update({ lowWalking: !profile.lowWalking })}
              className={`relative h-7 w-12 transition ${
                profile.lowWalking ? 'bg-charcoal-700' : 'bg-charcoal-700/15'
              }`}
              aria-pressed={profile.lowWalking}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-cream-50 transition ${
                  profile.lowWalking ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {profile.itineraryHistory.length > 0 && (
            <div className="mt-6 border-t border-charcoal-700/10 pt-5">
              <div className="text-[10px] uppercase tracking-[0.35em] text-charcoal-500">
                Previous itineraries
              </div>
              <div className="mt-3 space-y-2">
                {profile.itineraryHistory.slice(0, 3).map((h) => (
                  <div key={h.id} className="border-l-2 border-gold-300 bg-cream-100/40 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-charcoal-400">
                      {h.track} · {h.stopCount} stops · ${h.totalCost}
                    </div>
                    <div className="mt-1 font-serif text-sm italic text-charcoal-600">{h.request}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-charcoal-500">{label}</span>
      {children}
    </label>
  );
}
