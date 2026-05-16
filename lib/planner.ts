import type {
  BudgetPreference,
  GuestProfile,
  Interest,
  Itinerary,
  ItineraryStop,
  MealType,
  Place,
  PlanRequest,
  TravelStyle
} from '@/types';
import { PLACES, HOTEL } from '@/data/places';
import { MEAL_WINDOWS, minutesToTime, toMinutes } from './mealLogic';

const PRICE_VALUES: Record<Place['priceLevel'], number> = {
  free: 0,
  low: 1,
  medium: 2,
  premium: 3
};

const PRICE_BUDGET: Record<BudgetPreference, number> = {
  low: 1,
  medium: 2,
  premium: 3
};

function budgetTier(budget: number): BudgetPreference {
  if (budget <= 0) return 'medium';
  if (budget <= 50) return 'low';
  if (budget <= 150) return 'medium';
  return 'premium';
}

function placeIsOpen(place: Place, startMins: number, endMins: number): boolean {
  const open = toMinutes(place.openHours.open);
  const close = toMinutes(place.openHours.close);
  return startMins < close && endMins > open;
}

function isMealPlace(p: Place, slot: Exclude<MealType, 'cafe'>): boolean {
  if (!p.mealType) return false;
  return p.mealType === slot;
}

// Cheap deterministic 32-bit hash — used to break ties differently per track
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function trackJitter(placeId: string, track: TravelStyle): number {
  // Up to ±2 — small, deterministic, varies per track
  return (((hash32(placeId + ':' + track) % 200) - 100) / 50);
}

function trackBonus(place: Place, track: TravelStyle): number {
  const t = place.tags;
  const bf = place.bestFor;
  if (track === 'relaxed') {
    let b = 0;
    if (t.includes('quiet') || t.includes('garden') || t.includes('romantic')) b += 8;
    if (t.includes('hotel') || t.includes('on-property')) b += 10;
    if (t.includes('indoor') || t.includes('cafe')) b += 4;
    if (bf.includes('wellness')) b += 6;
    if (t.includes('walking') && place.estimatedDurationMinutes > 60) b -= 14;
    if (place.priceLevel === 'premium') b -= 2;
    return b;
  }
  if (track === 'ambitious') {
    let b = 0;
    if (bf.includes('outdoors') || bf.includes('scenic')) b += 8;
    if (t.includes('hike') || t.includes('walking')) b += 6;
    if (place.estimatedDurationMinutes >= 60) b += 3;
    if (t.includes('hotel') || t.includes('on-property')) b -= 6; // stay outside
    return b;
  }
  // balanced
  return 0;
}

function scorePlace(
  place: Place,
  request: PlanRequest,
  profile: GuestProfile,
  track: TravelStyle
): number {
  let score = 0;

  const interestMatches = place.bestFor.filter((b) => request.interests.includes(b)).length;
  score += interestMatches * 22;

  if (place.rating) score += (place.rating - 4) * 14;

  // Distance penalty grows quadratically for far places
  const overhead = Math.max(0, place.distanceMinutesFromHotel - 8);
  score -= overhead * 1.4;
  if (place.distanceMinutesFromHotel > 16) score -= 6;

  if (request.walkingTolerance === 'low' && place.tags.includes('walking')) score -= 16;
  if (request.walkingTolerance === 'high' && place.tags.includes('walking')) score += 8;

  const tier = budgetTier(request.budget || (profile.budgetPreference === 'low' ? 40 : profile.budgetPreference === 'premium' ? 250 : 100));
  const priceFit = Math.abs(PRICE_VALUES[place.priceLevel] - PRICE_BUDGET[tier]);
  score -= priceFit * 8;

  if (request.budget > 0 && place.estimatedCost > request.budget * 0.6) score -= 18;

  if (profile.favoritePlaces.includes(place.id)) score += 14;
  if (profile.lowWalking && place.tags.includes('walking') && place.estimatedDurationMinutes > 60)
    score -= 20;

  if (place.tags.includes('hotel') && tier === 'premium') score += 6;
  if (place.priceLevel === 'free' && tier === 'low') score += 12;

  score += trackBonus(place, track);
  score += trackJitter(place.id, track);

  return score;
}

function passesHardFilters(
  place: Place,
  request: PlanRequest,
  startMins: number,
  endMins: number,
  totalWindow: number
): boolean {
  if (!placeIsOpen(place, startMins, endMins)) return false;

  // Budget: a single non-meal stop should not exceed 85% of the budget
  if (request.budget > 0 && place.estimatedCost > request.budget * 0.85) return false;

  // Time fit — round-trip travel + duration must comfortably fit
  // Relaxed: allow places that fit within 90% of total window
  const fullTime = place.estimatedDurationMinutes + place.distanceMinutesFromHotel * 2;
  if (fullTime > totalWindow * 0.9) return false;

  // Walking-low: hard-exclude long walking-tagged places
  if (
    request.walkingTolerance === 'low' &&
    place.tags.includes('walking') &&
    place.estimatedDurationMinutes > 50
  )
    return false;

  // Interest filter — only require match if guest specified interests AND we have enough places
  // If filtering leaves too few places, this will be relaxed later
  if (request.interests.length > 0 && request.interests.length < 5) {
    const matches = place.bestFor.some((b) => request.interests.includes(b));
    if (!matches) return false;
  }

  return true;
}

function pickMealPlace(
  slot: Exclude<MealType, 'cafe'>,
  request: PlanRequest,
  profile: GuestProfile,
  used: Set<string>,
  track: TravelStyle,
  remainingBudget: number
): Place | undefined {
  const tier = budgetTier(request.budget);

  const candidates = PLACES.filter((p) => isMealPlace(p, slot) && !used.has(p.id)).filter((p) => {
    if (request.budget > 0 && p.estimatedCost > remainingBudget) return false;
    if (request.budget > 0 && p.estimatedCost > request.budget) return false;
    // Tier guard: low budget rejects premium meals outright
    if (tier === 'low' && p.priceLevel === 'premium') return false;
    return true;
  });

  if (!candidates.length) {
    // Fallback: ignore remaining-budget guard so we still get *something*
    const fallback = PLACES.filter((p) => isMealPlace(p, slot) && !used.has(p.id))
      .filter((p) => tier !== 'low' || p.priceLevel !== 'premium')
      .sort((a, b) => a.estimatedCost - b.estimatedCost);
    return fallback[0];
  }

  candidates.sort(
    (a, b) => scorePlace(b, request, profile, track) - scorePlace(a, request, profile, track)
  );
  return candidates[0];
}

interface TrackConfig {
  track: TravelStyle;
  title: string;
  subtitle: string;
  stopCount: number;
  returnBuffer: number;
  bufferPerStop: number;
}

const TRACK_CONFIGS: TrackConfig[] = [
  {
    track: 'relaxed',
    title: 'Relaxed Plan',
    subtitle: 'Fewer stops, more buffer, easy pace',
    stopCount: 2,
    returnBuffer: 30,
    bufferPerStop: 15
  },
  {
    track: 'balanced',
    title: 'Balanced Plan',
    subtitle: 'A smart mix — Rosie’s default pick',
    stopCount: 3,
    returnBuffer: 20,
    bufferPerStop: 10
  },
  {
    track: 'ambitious',
    title: 'Ambitious Plan',
    subtitle: 'More to see — tighter timing',
    stopCount: 4,
    returnBuffer: 15,
    bufferPerStop: 5
  }
];

function explanationFor(
  config: TrackConfig,
  request: PlanRequest,
  profile: GuestProfile,
  hasLunch: boolean,
  hasBreakfast: boolean,
  hasDinner: boolean,
  warnings: string[]
): string {
  const parts: string[] = [];

  parts.push(
    config.track === 'relaxed'
      ? `I kept this plan unhurried — only a couple of stops with a ${config.returnBuffer}-minute return buffer so you’re not rushed getting back to ${HOTEL.name}.`
      : config.track === 'balanced'
        ? `I built a smart mix of ${config.stopCount} stops with a ${config.returnBuffer}-minute return buffer to ${HOTEL.name}.`
        : `I fit ${config.stopCount} stops in — the pace is more ambitious, with a ${config.returnBuffer}-minute return buffer.`
  );

  if (hasBreakfast) parts.push('Since your window overlaps breakfast, I included a quick morning stop.');
  if (hasLunch) parts.push('Since your window overlaps lunch, I included a fast but well-reviewed lunch spot.');
  if (hasDinner) parts.push('Since your window overlaps dinner, I included a dinner reservation candidate.');

  if (request.walkingTolerance === 'low' || profile.lowWalking)
    parts.push('Because you asked for less walking, I avoided the longer outdoor options.');
  if (profile.budgetPreference === 'low' || request.budget < 50)
    parts.push('I leaned on free and low-cost gems to stay well under budget.');
  if (profile.budgetPreference === 'premium')
    parts.push('I leaned premium — Madera, Sense Spa, and upscale picks fit your style.');

  parts.push('I kept stops close to one another to avoid wasting your limited time in transit.');

  if (warnings.length) parts.push(`Heads up: ${warnings.join(' ')}`);

  return parts.join(' ');
}

export function generateItineraries(request: PlanRequest, profile: GuestProfile): Itinerary[] {
  const startMins = toMinutes(request.startTime);
  const endMins = toMinutes(request.endTime);
  const totalWindow = Math.max(60, endMins - startMins);

  return TRACK_CONFIGS.map((config) => {
    const warnings: string[] = [];
    const used = new Set<string>();
    const usedCategories = new Set<string>();
    const stops: ItineraryStop[] = [];

    let cursor = startMins;
    let totalCost = 0;

    stops.push({
      kind: 'hotel',
      time: minutesToTime(cursor),
      label: `Leave ${HOTEL.name}`,
      durationMinutes: 0,
      reason: 'Starting point'
    });

    const desiredStops = config.stopCount;

    let included: { breakfast: boolean; lunch: boolean; dinner: boolean } = {
      breakfast: request.includeBreakfast,
      lunch: request.includeLunch,
      dinner: request.includeDinner
    };

    // Per-track filtered + scored pool
    let pool = PLACES.filter((p) => !p.mealType)
      .filter((p) => passesHardFilters(p, request, startMins, endMins, totalWindow))
      .map((p) => ({ p, score: scorePlace(p, request, profile, config.track) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);

    // If hard filters left us with too few, relax interest constraint
    if (pool.length < desiredStops) {
      const relaxedRequest = { ...request, interests: [] as Interest[] };
      pool = PLACES.filter((p) => !p.mealType)
        .filter((p) => passesHardFilters(p, relaxedRequest, startMins, endMins, totalWindow))
        .map((p) => ({ p, score: scorePlace(p, request, profile, config.track) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    }

    const remainingBudget = () =>
      request.budget > 0 ? Math.max(0, request.budget - totalCost) : Number.POSITIVE_INFINITY;

    const insertMealIfDue = (
      currentCursor: number
    ): { mealAdded: boolean; mealSlot?: Exclude<MealType, 'cafe'> } => {
      const slots: Exclude<MealType, 'cafe'>[] = ['breakfast', 'lunch', 'dinner'];
      for (const slot of slots) {
        if (!included[slot]) continue;
        const w = MEAL_WINDOWS[slot];
        const wStart = toMinutes(w.start);
        const wEnd = toMinutes(w.end);
        if (currentCursor >= wStart && currentCursor <= wEnd) {
          const meal = pickMealPlace(slot, request, profile, used, config.track, remainingBudget());
          if (!meal) continue;
          used.add(meal.id);
          usedCategories.add(meal.category.split('/')[0].trim().toLowerCase());
          included[slot] = false;

          const travel =
            stops.length > 1
              ? Math.max(5, meal.distanceMinutesFromHotel - 2)
              : meal.distanceMinutesFromHotel;
          stops.push({
            kind: 'travel',
            time: minutesToTime(currentCursor),
            label: `Travel to ${meal.name}`,
            durationMinutes: travel,
            travelMinutesFromPrev: travel
          });
          const mealStart = currentCursor + travel;
          stops.push({
            kind: 'meal',
            time: minutesToTime(mealStart),
            place: meal,
            label: `${w.label} at ${meal.name}`,
            durationMinutes: meal.estimatedDurationMinutes,
            costEstimate: meal.estimatedCost,
            reason: `Fits your budget at $${meal.estimatedCost}. ${meal.reviewSummary}`,
            mealSlot: slot
          });
          totalCost += meal.estimatedCost;
          return { mealAdded: true, mealSlot: slot };
        }
      }
      return { mealAdded: false };
    };

    const categoryKey = (p: Place) => p.category.split('/')[0].trim().toLowerCase();
    const pickNext = (): Place | undefined => {
      // Prefer a place whose top-level category hasn't been used in this plan yet
      let candidate = pool.find((p) => !used.has(p.id) && !usedCategories.has(categoryKey(p)));
      if (!candidate) candidate = pool.find((p) => !used.has(p.id));
      return candidate;
    };

    let placed = 0;
    let safety = 0;
    while (placed < desiredStops && safety < 30) {
      safety += 1;

      const mealResult = insertMealIfDue(cursor);
      if (mealResult.mealAdded) {
        const last = stops[stops.length - 1];
        cursor += (stops[stops.length - 2]?.durationMinutes || 0) + last.durationMinutes + config.bufferPerStop;
        placed += 1;
        continue;
      }

      const next = pickNext();
      if (!next) break;
      if (request.budget > 0 && totalCost + next.estimatedCost > request.budget) {
        used.add(next.id); // skip but mark consumed so we move on
        continue;
      }
      used.add(next.id);
      usedCategories.add(categoryKey(next));

      const travel = Math.max(5, next.distanceMinutesFromHotel - (stops.length > 1 ? 2 : 0));
      stops.push({
        kind: 'travel',
        time: minutesToTime(cursor),
        label: `Travel to ${next.name}`,
        durationMinutes: travel,
        travelMinutesFromPrev: travel
      });
      const arrive = cursor + travel;
      const matchedInterests = next.bestFor.filter((b) => request.interests.includes(b));
      const interestNote = matchedInterests.length
        ? `Matches your interest in ${matchedInterests.slice(0, 2).join(' and ')}.`
        : 'Strong nearby pick.';
      stops.push({
        kind: 'place',
        time: minutesToTime(arrive),
        place: next,
        label: next.name,
        durationMinutes: next.estimatedDurationMinutes,
        costEstimate: next.estimatedCost,
        reason: `${next.reviewSummary} ${interestNote}`
      });
      totalCost += next.estimatedCost;

      cursor = arrive + next.estimatedDurationMinutes + config.bufferPerStop;
      placed += 1;

      if (cursor + config.returnBuffer >= endMins) break;
    }

    // try to squeeze remaining meals
    for (const _ of [0, 1, 2]) {
      const result = insertMealIfDue(cursor);
      if (!result.mealAdded) break;
      const last = stops[stops.length - 1];
      cursor += (stops[stops.length - 2]?.durationMinutes || 0) + last.durationMinutes + config.bufferPerStop;
    }

    const travelBack = 10;
    stops.push({
      kind: 'travel',
      time: minutesToTime(cursor),
      label: `Return to ${HOTEL.name}`,
      durationMinutes: travelBack,
      travelMinutesFromPrev: travelBack
    });
    const arriveBack = cursor + travelBack;
    stops.push({
      kind: 'hotel',
      time: minutesToTime(arriveBack),
      label: `Back at ${HOTEL.name}`,
      durationMinutes: 0,
      reason: `Return buffer of ${Math.max(0, endMins - arriveBack)} minutes before your window ends.`
    });

    if (arriveBack > endMins) {
      warnings.push(`This plan runs ${arriveBack - endMins} min past your end time — consider dropping a stop.`);
    } else if (endMins - arriveBack < config.returnBuffer / 2) {
      warnings.push('Return buffer is tight — Rosie recommends rideshare or shuttle.');
    }

    if (totalCost > request.budget) {
      warnings.push(`Total cost ($${totalCost}) is over your $${request.budget} budget.`);
    }

    const totalMinutes = arriveBack - startMins;

    const hasBreakfast = stops.some((s) => s.mealSlot === 'breakfast');
    const hasLunch = stops.some((s) => s.mealSlot === 'lunch');
    const hasDinner = stops.some((s) => s.mealSlot === 'dinner');

    return {
      track: config.track,
      title: config.title,
      subtitle: config.subtitle,
      stops,
      totalCost,
      totalMinutes,
      returnBufferMinutes: Math.max(0, endMins - arriveBack),
      explanation: explanationFor(config, request, profile, hasLunch, hasBreakfast, hasDinner, warnings),
      warnings
    };
  });
}

function normalizeNumbers(input: string): string {
  let t = input;

  t = t.replace(/\bhalf\s+an\s+hour\b/g, '0.5 hours');
  t = t.replace(/\ban\s+hour\b/g, '1 hour');
  t = t.replace(/\ba\s+couple(?:\s+of)?\s+hours?\b/g, '2 hours');
  t = t.replace(/\ba\s+few\s+hours?\b/g, '3 hours');
  t = t.replace(/\bnoon\b/g, '12 pm');
  t = t.replace(/\bmidnight\b/g, '12 am');
  t = t.replace(/\bo['']?\s*clock\b/g, '');

  const tens: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  const ones: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9
  };

  // "one hundred", "two hundred fifty"
  t = t.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred(?:\s+and)?\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
    (_m, a, b) => String(ones[a] * 100 + tens[b])
  );
  t = t.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred\b/g,
    (_m, a) => String(ones[a] * 100)
  );
  t = t.replace(/\b(a|one)\s+hundred\b/g, '100');

  // Compound tens-ones: "twenty five" or "twenty-five"
  t = t.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_m, a, b) => String(tens[a] + ones[b])
  );

  const singles: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4',
    five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    ten: '10', eleven: '11', twelve: '12', thirteen: '13',
    fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17',
    eighteen: '18', nineteen: '19',
    twenty: '20', thirty: '30', forty: '40', fifty: '50',
    sixty: '60', seventy: '70', eighty: '80', ninety: '90'
  };
  for (const [w, d] of Object.entries(singles)) {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  }

  return t;
}

export function parseFreeText(text: string): Partial<PlanRequest> {
  const raw = text.toLowerCase();
  const t = normalizeNumbers(raw);
  const out: Partial<PlanRequest> = {};

  const hoursMatch = t.match(/(\d+(?:\.\d+)?)\s*hour/);
  if (hoursMatch) out.hours = Number(hoursMatch[1]);

  const fromTo = t.match(/from\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|until|-|–)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (fromTo) {
    out.startTime = normalize12h(fromTo[1], fromTo[2], fromTo[3]);
    out.endTime = normalize12h(fromTo[4], fromTo[5], fromTo[6]);
  } else {
    const untilMatch = t.match(/\b(?:until|till|back\s+by|return\s+by|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (untilMatch) {
      out.endTime = normalize12h(untilMatch[1], untilMatch[2], untilMatch[3]);
    } else if (/\b(?:rest of the|this|the)\s+morning\b|\bthe\s+morning\b/.test(t)) {
      out.endTime = '12:00';
    } else if (/\b(?:this|the)\s+afternoon\b/.test(t)) {
      out.endTime = '17:00';
    } else if (/\b(?:this|the)\s+evening\b/.test(t)) {
      out.endTime = '21:00';
    } else if (/\b(?:before|until|till)\s+dinner\b/.test(t)) {
      out.endTime = '17:00';
    } else if (/\b(?:before|until|till)\s+lunch\b/.test(t)) {
      out.endTime = '12:00';
    } else if (/\bthe\s+rest\s+of\s+the\s+day\b/.test(t)) {
      out.endTime = '21:00';
    } else if (/\ball\s+day\b|\bwhole\s+day\b/.test(t)) {
      out.hours = 9;
    } else if (/\bfor\s+a\s+while\b|\ba\s+little\s+while\b/.test(t)) {
      out.hours = 3;
    } else if (/\bfor\s+a\s+bit\b|\bjust\s+a\s+bit\b|\bquick(?:\s+(?:trip|outing))?\b/.test(t)) {
      out.hours = 2;
    } else if (!out.hours) {
      // Standalone time like "8 pm" / "3:30 pm" → treat as end time
      const standalone = t.match(/(?:^|[^a-z])(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
      if (standalone) {
        out.endTime = normalize12h(standalone[1], standalone[2], standalone[3]);
      }
    }
  }

  // Budget: "under 80", "$80", "80 dollars", "80 bucks", or just "80" near "budget"
  const budgetMatch = t.match(/(?:under|below|less than|<|around|about|roughly|~)\s*\$?(\d+)/);
  if (budgetMatch) out.budget = Number(budgetMatch[1]);
  else {
    const dollarMatch = t.match(/\$(\d+)/);
    if (dollarMatch) out.budget = Number(dollarMatch[1]);
    else {
      const dollarsWord = t.match(/(\d+)\s*(?:dollar|buck)/);
      if (dollarsWord) out.budget = Number(dollarsWord[1]);
      else {
        const budgetNear = t.match(/budget[^\d]*(\d+)/);
        if (budgetNear) out.budget = Number(budgetNear[1]);
      }
    }
  }
  // Indirect budget descriptors
  if (!out.budget) {
    if (/\b(?:no\s+budget|money(?:'s|\s+is)\s+no\s+object|splurge|no\s+limit|spare\s+no\s+expense|all\s+out|treat\s+myself|sky'?s\s+the\s+limit|whatever\s+it\s+(?:costs|takes))\b/.test(t)) {
      out.budget = 500;
    } else if (/\b(?:tight(?:\s+budget)?|cheap|frugal|save\s+money|budget(?:-|\s+)?friendly|inexpensive|affordable|low(?:er)?\s+budget|on\s+a\s+budget|not\s+much\s+money)\b/.test(t)) {
      out.budget = 40;
    } else if (/\b(?:reasonable|moderate|mid(?:-|\s)?range|medium\s+budget|not\s+too\s+expensive|nothing\s+crazy|sensible)\b/.test(t)) {
      out.budget = 100;
    } else if (/\b(?:premium|high[\s-]end|luxury\s+budget)\b/.test(t)) {
      out.budget = 250;
    }
  }

  const interests: Interest[] = [];

  // Open-ended / "I'm flexible" answers — fill a broad mix so Rosie can advance.
  const openEnded =
    /\b(?:open\s+to\s+(?:everything|anything|all|it\s+all|a\s+mix|whatever)|i'?m\s+open|anything\s+(?:works|goes|is\s+fine|you\s+recommend)|everything\s+(?:works|sounds\s+good|is\s+fine)?|surprise\s+me|you\s+(?:decide|choose|pick|recommend)|whatever\s+(?:you|works|sounds)|a\s+(?:bit\s+of\s+everything|mix(?:\s+of\s+everything)?)|all\s+of\s+(?:them|the\s+above)|no\s+preference|don'?t\s+(?:mind|care)|either(?:\s+is\s+fine)?)\b/.test(t);
  if (openEnded) {
    interests.push('scenic', 'food', 'art', 'outdoors', 'wellness');
  }

  // Liberal matching — Scribe often mishears "scenic" as "seating"/"seeing"/"ceiling"
  if (/scenic|seating|seeing|ceiling|view|vista|nature|outdoor|sunset|sunrise|garden|hike|trail/.test(t)) interests.push('scenic', 'outdoors');
  if (/food|eat|lunch|dinner|breakfast|cuisine|restaurant|brunch|coffee/.test(t)) interests.push('food');
  if (/art|museum|gallery|exhibit|painting|sculpture/.test(t)) interests.push('art');
  if (/shop|boutique|store|mall/.test(t)) interests.push('shopping');
  if (/spa|wellness|relax|massage|yoga|sauna|pool/.test(t)) interests.push('wellness');
  if (/luxury|premium|fancy|upscale|fine\s+dining|michelin/.test(t)) interests.push('luxury');
  if (/family|kids|children|family-friendly/.test(t)) interests.push('family-friendly');
  if (/tech|silicon|startup|stanford/.test(t)) interests.push('tech');
  if (interests.length) out.interests = Array.from(new Set(interests));

  if (/\b(?:less|low|minimal|easy|light)\s+walking\b|\bdon'?t\s+want\s+to\s+walk\b|\bnot\s+much\s+walking\b|\bshort\s+walks?\b|\btired\b|\bfeet\s+hurt\b|\blow\s+energy\b|\bexhausted\b|\bsit\s+(?:down|a\s+lot)\b|\bsave\s+my\s+legs\b/.test(t))
    out.walkingTolerance = 'low';
  else if (/\blots\s+of\s+walking\b|\bwalk\s+a\s+lot\b|\bhappy\s+to\s+walk\b|\blong\s+walks?\b|\blove\s+walking\b|\bactive\b|\benergetic\b|\bwant\s+(?:exercise|to\s+move)\b|\bstretch\s+my\s+legs\b/.test(t))
    out.walkingTolerance = 'high';

  if (/rideshare|uber|lyft/.test(t)) out.transportation = 'rideshare';
  else if (/shuttle/.test(t)) out.transportation = 'hotel shuttle';
  else if (/driving|drive|car/.test(t)) out.transportation = 'driving';
  else if (/walking|on foot/.test(t)) out.transportation = 'walking';

  if (/include lunch|with lunch|want lunch|do lunch|have lunch|lunch please|grab lunch/.test(t)) out.includeLunch = true;
  if (/skip lunch|no lunch|already had lunch|just had lunch|ate lunch/.test(t)) out.includeLunch = false;
  if (/include breakfast|with breakfast|want breakfast|breakfast please|grab breakfast/.test(t)) out.includeBreakfast = true;
  if (/skip breakfast|no breakfast|already had breakfast|just had breakfast|ate breakfast/.test(t)) out.includeBreakfast = false;
  if (/include dinner|with dinner|want dinner|dinner please|grab dinner/.test(t)) out.includeDinner = true;
  if (/skip dinner|no dinner|already had dinner|just had dinner/.test(t)) out.includeDinner = false;

  // Generic hunger cues — leaves decision to the meal-window detector
  if (/\b(?:i'?m\s+hungry|starving|peckish|could\s+eat|in\s+the\s+mood\s+for\s+food|grab\s+a\s+bite|bite\s+to\s+eat)\b/.test(t)) {
    if (out.includeLunch === undefined) out.includeLunch = true;
    if (out.includeDinner === undefined) out.includeDinner = true;
    if (out.includeBreakfast === undefined) out.includeBreakfast = true;
  }
  if (/\b(?:i\s+just\s+ate|not\s+hungry|already\s+ate|i'?m\s+full)\b/.test(t)) {
    if (out.includeLunch === undefined) out.includeLunch = false;
    if (out.includeDinner === undefined) out.includeDinner = false;
    if (out.includeBreakfast === undefined) out.includeBreakfast = false;
  }

  return out;
}

function normalize12h(h: string, m: string | undefined, ampm: string | undefined): string {
  let hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (ampm === 'pm' && hh < 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}
