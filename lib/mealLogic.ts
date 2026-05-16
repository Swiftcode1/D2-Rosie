import type { MealStatus, MealType } from '@/types';

export const MEAL_WINDOWS: Record<Exclude<MealType, 'cafe'>, { start: string; end: string; label: string }> = {
  breakfast: { start: '07:00', end: '10:00', label: 'Breakfast' },
  lunch: { start: '11:30', end: '14:00', label: 'Lunch' },
  dinner: { start: '17:00', end: '20:30', label: 'Dinner' }
};

export function toMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function detectMealOverlap(startTime: string, endTime: string): MealStatus {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  const check = (m: { start: string; end: string }) =>
    overlaps(start, end, toMinutes(m.start), toMinutes(m.end));

  return {
    breakfast: { overlap: check(MEAL_WINDOWS.breakfast), included: check(MEAL_WINDOWS.breakfast) },
    lunch: { overlap: check(MEAL_WINDOWS.lunch), included: check(MEAL_WINDOWS.lunch) },
    dinner: { overlap: check(MEAL_WINDOWS.dinner), included: check(MEAL_WINDOWS.dinner) }
  };
}

export function detectMealsFromText(text: string): {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
} {
  const t = text.toLowerCase();
  const out: { breakfast?: boolean; lunch?: boolean; dinner?: boolean } = {};
  if (/\b(already ate|skip breakfast|no breakfast)\b/.test(t)) out.breakfast = false;
  else if (/\bbreakfast\b/.test(t)) out.breakfast = true;
  if (/\b(skip lunch|no lunch|already ate)\b/.test(t)) out.lunch = false;
  else if (/\blunch\b/.test(t)) out.lunch = true;
  if (/\b(skip dinner|no dinner)\b/.test(t)) out.dinner = false;
  else if (/\bdinner\b/.test(t)) out.dinner = true;
  return out;
}
