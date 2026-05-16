import type {
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

const PRICE_BUDGET: Record<GuestProfile['budgetPreference'], number> = {
  low: 1,
  medium: 2,
  premium: 3
};

function placeIsOpen(place: Place, startMins: number, endMins: number): boolean {
  const open = toMinutes(place.openHours.open);
  const close = toMinutes(place.openHours.close);
  return startMins < close && endMins > open;
}

function isMealPlace(p: Place, slot: Exclude<MealType, 'cafe'>): boolean {
  if (!p.mealType) return false;
  if (p.mealType === slot) return true;
  return false;
}

function scorePlace(place: Place, request: PlanRequest, profile: GuestProfile): number {
  let score = 0;

  const interestMatches = place.bestFor.filter((b) => request.interests.includes(b)).length;
  score += interestMatches * 18;

  if (place.rating) score += (place.rating - 4) * 12;

  const distancePenalty = Math.max(0, place.distanceMinutesFromHotel - 8);
  score -= distancePenalty * 1.2;

  if (request.walkingTolerance === 'low' && place.tags.includes('walking')) score -= 12;
  if (request.walkingTolerance === 'high' && place.tags.includes('walking')) score += 5;

  const priceFit = Math.abs(PRICE_VALUES[place.priceLevel] - PRICE_BUDGET[profile.budgetPreference]);
  score -= priceFit * 6;

  if (place.estimatedCost > request.budget) score -= 30;

  if (profile.favoritePlaces.includes(place.id)) score += 14;

  if (profile.lowWalking && place.tags.includes('walking') && place.estimatedDurationMinutes > 60)
    score -= 18;

  if (place.tags.includes('hotel') && profile.budgetPreference === 'premium') score += 6;
  if (place.priceLevel === 'free' && profile.budgetPreference === 'low') score += 8;

  return score;
}

function pickMealPlace(
  slot: Exclude<MealType, 'cafe'>,
  request: PlanRequest,
  profile: GuestProfile,
  used: Set<string>
): Place | undefined {
  const candidates = PLACES.filter((p) => isMealPlace(p, slot) && !used.has(p.id)).filter((p) => {
    if (p.estimatedCost > request.budget) return false;
    return true;
  });
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => scorePlace(b, request, profile) - scorePlace(a, request, profile));
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

  const baseCandidates = PLACES.filter((p) => !p.mealType).filter((p) =>
    placeIsOpen(p, startMins, endMins)
  );

  return TRACK_CONFIGS.map((config) => {
    const warnings: string[] = [];
    const used = new Set<string>();
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

    const pool = [...baseCandidates]
      .map((p) => ({ p, score: scorePlace(p, request, profile) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);

    const insertMealIfDue = (currentCursor: number): { mealAdded: boolean; mealSlot?: Exclude<MealType, 'cafe'> } => {
      const slots: Exclude<MealType, 'cafe'>[] = ['breakfast', 'lunch', 'dinner'];
      for (const slot of slots) {
        if (!included[slot]) continue;
        const w = MEAL_WINDOWS[slot];
        const wStart = toMinutes(w.start);
        const wEnd = toMinutes(w.end);
        if (currentCursor >= wStart && currentCursor <= wEnd) {
          const meal = pickMealPlace(slot, request, profile, used);
          if (!meal) continue;
          used.add(meal.id);
          included[slot] = false;

          const travel = stops.length > 1 ? Math.max(5, meal.distanceMinutesFromHotel - 2) : meal.distanceMinutesFromHotel;
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
            reason: `Well-reviewed ${slot} stop close by — ${meal.reviewSummary}`,
            mealSlot: slot
          });
          totalCost += meal.estimatedCost;
          return { mealAdded: true, mealSlot: slot };
        }
      }
      return { mealAdded: false };
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

      const next = pool.find((p) => !used.has(p.id));
      if (!next) break;
      used.add(next.id);

      const travel = Math.max(5, next.distanceMinutesFromHotel - (stops.length > 1 ? 2 : 0));
      stops.push({
        kind: 'travel',
        time: minutesToTime(cursor),
        label: `Travel to ${next.name}`,
        durationMinutes: travel,
        travelMinutesFromPrev: travel
      });
      const arrive = cursor + travel;
      stops.push({
        kind: 'place',
        time: minutesToTime(arrive),
        place: next,
        label: next.name,
        durationMinutes: next.estimatedDurationMinutes,
        costEstimate: next.estimatedCost,
        reason: `${next.reviewSummary} ${request.interests.some((i) => next.bestFor.includes(i)) ? 'Matches your interests.' : 'Strong nearby pick.'}`
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
    } else if (/\b(rest of the|this)\s+morning\b/.test(t)) {
      out.endTime = '12:00';
    } else if (/\b(this|the)\s+afternoon\b/.test(t)) {
      out.endTime = '17:00';
    } else if (/\b(this|the)\s+evening\b/.test(t)) {
      out.endTime = '21:00';
    } else if (/\bbefore\s+dinner\b/.test(t)) {
      out.endTime = '17:00';
    } else if (/\ball\s+day\b/.test(t)) {
      out.hours = 9;
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

  const interests: Interest[] = [];
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

  if (/less walking|low walking|don'?t want to walk|not much walking|easy walking|minimal walking|short walks?/.test(t))
    out.walkingTolerance = 'low';
  else if (/lots of walking|walk a lot|happy to walk|long walks?|love walking/.test(t))
    out.walkingTolerance = 'high';

  if (/rideshare|uber|lyft/.test(t)) out.transportation = 'rideshare';
  else if (/shuttle/.test(t)) out.transportation = 'hotel shuttle';
  else if (/driving|drive|car/.test(t)) out.transportation = 'driving';
  else if (/walking|on foot/.test(t)) out.transportation = 'walking';

  if (/include lunch|with lunch|want lunch|do lunch|have lunch|lunch please/.test(t)) out.includeLunch = true;
  if (/skip lunch|no lunch|already had lunch/.test(t)) out.includeLunch = false;
  if (/include breakfast|with breakfast|want breakfast|breakfast please/.test(t)) out.includeBreakfast = true;
  if (/skip breakfast|no breakfast|already had breakfast/.test(t)) out.includeBreakfast = false;
  if (/include dinner|with dinner|want dinner|dinner please/.test(t)) out.includeDinner = true;
  if (/skip dinner|no dinner/.test(t)) out.includeDinner = false;

  return out;
}

function normalize12h(h: string, m: string | undefined, ampm: string | undefined): string {
  let hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (ampm === 'pm' && hh < 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}
