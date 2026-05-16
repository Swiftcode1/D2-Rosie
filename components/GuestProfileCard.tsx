'use client';

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
  const update = (patch: Partial<GuestProfile>) => onChange({ ...profile, ...patch });

  const toggleInterest = (i: Interest) => {
    const has = profile.interests.includes(i);
    update({
      interests: has ? profile.interests.filter((x) => x !== i) : [...profile.interests, i]
    });
  };

  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold-500">Guest profile</div>
          <h3 className="mt-1 font-serif text-2xl text-charcoal-700">Who is staying with us</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              saveProfile(profile);
            }}
            className="rounded-full border border-rosie-200 bg-rosie-50 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-rosie-600 hover:bg-rosie-100"
          >
            Save
          </button>
          <button
            onClick={() => onChange(loadProfile())}
            className="rounded-full border border-cream-200 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-charcoal-500 hover:bg-cream-100"
          >
            Load
          </button>
          <button
            onClick={() => {
              clearProfile();
              onChange(loadProfile());
            }}
            className="rounded-full border border-cream-200 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-charcoal-400 hover:bg-cream-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
        <div className="text-xs uppercase tracking-[0.2em] text-charcoal-400">Interests</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = profile.interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                  on
                    ? 'border-rosie-300 bg-rosie-100 text-rosie-700'
                    : 'border-cream-200 bg-cream-50 text-charcoal-500 hover:bg-cream-100'
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-cream-200 bg-cream-50 p-4">
        <div>
          <div className="font-medium text-charcoal-600">Low walking preference</div>
          <div className="text-xs text-charcoal-400">Rosie will prefer rideshare or shuttle-friendly stops.</div>
        </div>
        <button
          type="button"
          onClick={() => update({ lowWalking: !profile.lowWalking })}
          className={`relative h-7 w-12 rounded-full transition ${
            profile.lowWalking ? 'bg-rosie-500' : 'bg-cream-200'
          }`}
          aria-pressed={profile.lowWalking}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              profile.lowWalking ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {profile.itineraryHistory.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.2em] text-charcoal-400">Previous itineraries</div>
          <div className="mt-2 space-y-1 text-sm text-charcoal-500">
            {profile.itineraryHistory.slice(0, 3).map((h) => (
              <div key={h.id} className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2">
                <div className="text-charcoal-600">
                  {h.track} plan · {h.stopCount} stops · ${h.totalCost}
                </div>
                <div className="text-xs text-charcoal-400">{h.request}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-[0.2em] text-charcoal-400">{label}</span>
      {children}
    </label>
  );
}
