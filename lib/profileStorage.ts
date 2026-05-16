import type { GuestProfile, SavedItinerary } from '@/types';

const KEY = 'rosie.guest.profile.v1';

export const DEFAULT_PROFILE: GuestProfile = {
  guestName: '',
  roomNumber: '',
  travelStyle: 'balanced',
  budgetPreference: 'medium',
  transportation: 'rideshare',
  dietaryPreference: '',
  interests: ['scenic', 'food'],
  lowWalking: false,
  favoritePlaces: [],
  itineraryHistory: []
};

export function loadProfile(): GuestProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: GuestProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

export function appendItineraryHistory(entry: SavedItinerary): GuestProfile {
  const profile = loadProfile();
  const updated: GuestProfile = {
    ...profile,
    itineraryHistory: [entry, ...profile.itineraryHistory].slice(0, 10)
  };
  saveProfile(updated);
  return updated;
}

export function toggleFavorite(placeId: string): GuestProfile {
  const profile = loadProfile();
  const exists = profile.favoritePlaces.includes(placeId);
  const updated: GuestProfile = {
    ...profile,
    favoritePlaces: exists
      ? profile.favoritePlaces.filter((p) => p !== placeId)
      : [...profile.favoritePlaces, placeId]
  };
  saveProfile(updated);
  return updated;
}
