export type PriceLevel = 'free' | 'low' | 'medium' | 'premium';
export type TravelStyle = 'relaxed' | 'balanced' | 'packed';
export type BudgetPreference = 'low' | 'medium' | 'premium';
export type Transportation = 'walking' | 'rideshare' | 'driving' | 'hotel shuttle';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'cafe';
export type Interest =
  | 'food'
  | 'outdoors'
  | 'shopping'
  | 'art'
  | 'family-friendly'
  | 'luxury'
  | 'nightlife'
  | 'wellness'
  | 'tech'
  | 'scenic';

export interface Place {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  estimatedDurationMinutes: number;
  estimatedCost: number;
  priceLevel: PriceLevel;
  distanceMinutesFromHotel: number;
  distanceMilesFromHotel: number;
  bestFor: Interest[];
  tags: string[];
  reviewSummary: string;
  reviewSignals: string[];
  openHours: { open: string; close: string };
  mealType?: MealType;
  bookingAvailable: boolean;
  address: string;
  rating?: number;
}

export interface GuestProfile {
  guestName: string;
  roomNumber: string;
  travelStyle: TravelStyle;
  budgetPreference: BudgetPreference;
  transportation: Transportation;
  dietaryPreference: string;
  interests: Interest[];
  lowWalking: boolean;
  favoritePlaces: string[];
  itineraryHistory: SavedItinerary[];
}

export interface SavedItinerary {
  id: string;
  createdAt: string;
  track: TravelStyle;
  request: string;
  totalCost: number;
  totalMinutes: number;
  stopCount: number;
}

export interface PlanRequest {
  startTime: string;
  endTime: string;
  hours?: number;
  budget: number;
  stops: number;
  transportation: Transportation;
  interests: Interest[];
  pace: TravelStyle;
  walkingTolerance: 'low' | 'medium' | 'high';
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  rawText?: string;
}

export interface ItineraryStop {
  kind: 'hotel' | 'place' | 'travel' | 'meal';
  time: string;
  place?: Place;
  label: string;
  durationMinutes: number;
  costEstimate?: number;
  travelMinutesFromPrev?: number;
  reason?: string;
  mealSlot?: MealType;
}

export interface Itinerary {
  track: TravelStyle;
  title: string;
  subtitle: string;
  stops: ItineraryStop[];
  totalCost: number;
  totalMinutes: number;
  returnBufferMinutes: number;
  explanation: string;
  warnings: string[];
}

export interface MealStatus {
  breakfast: { overlap: boolean; included: boolean };
  lunch: { overlap: boolean; included: boolean };
  dinner: { overlap: boolean; included: boolean };
}
