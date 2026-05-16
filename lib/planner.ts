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
    track: 'packed',
    title: 'Packed Plan',
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
        : `I packed in ${config.stopCount} stops — timing is tighter, with a ${config.returnBuffer}-minute return buffer.`
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

export function parseFreeText(text: string): Partial<PlanRequest> {
  const t = text.toLowerCase();
  const out: Partial<PlanRequest> = {};

  // Hours: "3 hours", "3hr", "3 hrs", "3h", "for 3 hours"
  const hoursMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/);
  if (hoursMatch) out.hours = Number(hoursMatch[1]);

  // Time range — optional "from"/"between", many separators, and standalone
  // forms like "1pm-4pm" or "10 to 3".
  const fromTo = t.match(
    /(?:from\s+|between\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|until|till|-|–|—|thru|through|and)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  );
  if (fromTo) {
    out.startTime = normalize12h(fromTo[1], fromTo[2], fromTo[3]);
    out.endTime = normalize12h(fromTo[4], fromTo[5], fromTo[6]);
  }

  // Budget: a lot of natural phrasings
  let budget: number | undefined;
  const budgetUnder = t.match(/(?:under|below|less than|max\.?|maximum|up to|no more than|<=?)\s*\$?(\d+)/);
  if (budgetUnder) budget = Number(budgetUnder[1]);
  if (budget === undefined) {
    const dollarFirst = t.match(/\$(\d+)/);
    if (dollarFirst) budget = Number(dollarFirst[1]);
  }
  if (budget === undefined) {
    const budgetPhrase = t.match(/(?:budget(?:\s+of)?|around|about|approximately|roughly|spend|spending)\s*\$?(\d+)/);
    if (budgetPhrase) budget = Number(budgetPhrase[1]);
  }
  if (budget === undefined) {
    const dollarsAfter = t.match(/(\d+)\s*(?:dollars?|bucks?|usd)\b/);
    if (dollarsAfter) budget = Number(dollarsAfter[1]);
  }
  if (budget !== undefined) out.budget = budget;

  // Stops: "2 stops", "three places", "a couple of spots"
  const stopsMatch = t.match(/(\d+)\s*(?:stops?|places?|spots?|stops?)/);
  if (stopsMatch) out.stops = Math.max(1, Math.min(6, Number(stopsMatch[1])));
  else if (/\bcouple\b/.test(t)) out.stops = 2;
  else if (/\bhandful\b/.test(t)) out.stops = 4;

  // Interests — broader vocabulary
  const interests: Interest[] = [];
  if (/scenic|view|vista|nature|outdoor|outside|hike|hiking|trail|park|garden|beach|landscape|fresh air/.test(t))
    interests.push('scenic', 'outdoors');
  if (/food|eat|lunch|dinner|breakfast|brunch|cuisine|restaurant|dine|dining|tast|hungry|meal/.test(t))
    interests.push('food');
  if (/art|museum|gallery|exhibit|sculpture|paint/.test(t)) interests.push('art');
  if (/shop|boutique|store|mall|retail/.test(t)) interests.push('shopping');
  if (/spa|wellness|relax|yoga|massage|unwind|peaceful|quiet|calm/.test(t)) interests.push('wellness');
  if (/luxury|premium|fancy|upscale|fine[- ]dining|michelin|five[- ]star|high[- ]end/.test(t))
    interests.push('luxury');
  if (/family|kid|kids|child|children|toddler/.test(t)) interests.push('family-friendly');
  if (/tech|silicon|startup|innovation/.test(t)) interests.push('tech');
  if (/nightlife|bar|cocktail|club|drink/.test(t)) interests.push('nightlife');
  if (interests.length) out.interests = Array.from(new Set(interests));

  // Walking tolerance
  if (/less walking|low walking|don'?t want to walk|not much walking|minimal walking|easy on (?:my )?feet|bad knee|tired feet/.test(t))
    out.walkingTolerance = 'low';
  else if (/lots? of walking|walk a lot|love walking|much walking|active/.test(t))
    out.walkingTolerance = 'high';

  // Transportation
  if (/rideshare|uber|lyft|taxi/.test(t)) out.transportation = 'rideshare';
  else if (/shuttle|hotel car/.test(t)) out.transportation = 'hotel shuttle';
  else if (/driving|drive\b|car\b/.test(t)) out.transportation = 'driving';
  else if (/walk(?:ing)?\b/.test(t)) out.transportation = 'walking';

  // Pace
  if (/relaxed|slow|easy pace|leisurely|chill|unhurried|laid[- ]back/.test(t)) out.pace = 'relaxed';
  else if (/packed|busy|tight|lots? to do|fast[- ]paced|cram|squeeze in/.test(t)) out.pace = 'packed';
  else if (/balanced|mix\b|moderate/.test(t)) out.pace = 'balanced';

  // Meals — broader triggers
  if (/include lunch|with lunch|grab lunch|have lunch|lunch (?:in|out|spot|stop|reservation)|do lunch/.test(t))
    out.includeLunch = true;
  if (/skip lunch|no lunch|without lunch|already (?:had|ate) lunch/.test(t)) out.includeLunch = false;
  if (/include breakfast|with breakfast|grab breakfast|have breakfast|brunch/.test(t))
    out.includeBreakfast = true;
  if (/skip breakfast|no breakfast|already had breakfast/.test(t)) out.includeBreakfast = false;
  if (/include dinner|with dinner|grab dinner|have dinner|dinner (?:res|reservation|out|spot|stop)/.test(t))
    out.includeDinner = true;
  if (/skip dinner|no dinner|without dinner/.test(t)) out.includeDinner = false;

  return out;
}

function normalize12h(h: string, m: string | undefined, ampm: string | undefined): string {
  let hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (ampm === 'pm' && hh < 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}
