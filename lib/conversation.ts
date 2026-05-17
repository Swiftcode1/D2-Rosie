import type { GuestProfile, PlanRequest } from '@/types';
import { detectMealOverlap, minutesToTime, toMinutes } from './mealLogic';

export type ConversationStep =
  | 'idle'
  | 'asking_time'
  | 'asking_interests'
  | 'asking_budget'
  | 'asking_meals'
  | 'ready'
  | 'done';

export interface ConvMessage {
  id: string;
  speaker: 'rosie' | 'guest';
  text: string;
  ts: number;
}

export interface ConvState {
  step: ConversationStep;
  messages: ConvMessage[];
  request: PlanRequest;
  askedMeals: boolean;
  stuckCount: number;
}

let MESSAGE_COUNTER = 0;
const nextId = () => `m${Date.now()}-${++MESSAGE_COUNTER}`;

export const GREETING_TEXT =
  "Hello, I'm Rosie. How many hours would you like to explore?";

export function nowAsTime(): string {
  const d = new Date();
  const minutes = d.getHours() * 60 + d.getMinutes();
  const rounded = Math.ceil(minutes / 5) * 5;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function addHoursToTime(start: string, hours: number): string {
  const total = toMinutes(start) + Math.round(hours * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function emptyRequest(): PlanRequest {
  return {
    startTime: nowAsTime(),
    endTime: '',
    budget: 0,
    stops: 3,
    transportation: 'rideshare',
    interests: [],
    pace: 'balanced',
    walkingTolerance: 'medium',
    includeBreakfast: false,
    includeLunch: false,
    includeDinner: false
  };
}

export function initialState(): ConvState {
  return {
    step: 'idle',
    messages: [],
    request: emptyRequest(),
    askedMeals: false,
    stuckCount: 0
  };
}

export function rosieMessage(text: string): ConvMessage {
  return { id: nextId(), speaker: 'rosie', text, ts: Date.now() };
}

export function guestMessage(text: string): ConvMessage {
  return { id: nextId(), speaker: 'guest', text, ts: Date.now() };
}

export function beginGreeting(state: ConvState): { state: ConvState; reply: string } {
  if (state.messages.length > 0) return { state, reply: state.messages[state.messages.length - 1].text };
  const next: ConvState = {
    ...state,
    step: 'asking_time',
    messages: [rosieMessage(GREETING_TEXT)]
  };
  return { state: next, reply: GREETING_TEXT };
}

export interface ProcessResult {
  state: ConvState;
  reply: string;
  readyToPlan: boolean;
}

export async function processGuest(
  state: ConvState,
  text: string,
  _profile: GuestProfile
): Promise<ProcessResult> {
  const trimmed = text.trim();
  if (!trimmed) return { state, reply: '', readyToPlan: false };

  const parsed = await parseWithLLM(trimmed);
  const req: PlanRequest = { ...state.request, rawText: trimmed };

  if (parsed.startTime) req.startTime = parsed.startTime;
  else if (!req.startTime) req.startTime = nowAsTime();

  if (parsed.hours) {
    req.endTime = addHoursToTime(req.startTime, parsed.hours);
  } else if (parsed.endTime) {
    req.endTime = parsed.endTime;
  }

  if (parsed.budget) req.budget = parsed.budget;
  if (parsed.interests?.length) {
    req.interests = Array.from(new Set([...req.interests, ...parsed.interests]));
  }
  if (parsed.walkingTolerance) req.walkingTolerance = parsed.walkingTolerance;
  if (parsed.transportation) req.transportation = parsed.transportation;
  if (parsed.includeBreakfast !== undefined) req.includeBreakfast = parsed.includeBreakfast;
  if (parsed.includeLunch !== undefined) req.includeLunch = parsed.includeLunch;
  if (parsed.includeDinner !== undefined) req.includeDinner = parsed.includeDinner;

  // Catch yes/no for last meal question
  let askedMeals = state.askedMeals;
  if (state.step === 'asking_meals') {
    const yes = /\b(yes|yeah|yep|sure|please|okay|ok|sounds good|why not)\b/i.test(trimmed);
    const no = /\b(no|nope|skip|already ate|don'?t|i'?m good)\b/i.test(trimmed);
    if (yes || no) {
      const meal = detectMealOverlap(req.startTime, req.endTime);
      if (meal.lunch.overlap) req.includeLunch = yes;
      else if (meal.breakfast.overlap) req.includeBreakfast = yes;
      else if (meal.dinner.overlap) req.includeDinner = yes;
    }
    askedMeals = true;
  }

  const messages: ConvMessage[] = [...state.messages, guestMessage(trimmed)];
  let decision: Decision = await decideNext({ ...state, request: req, askedMeals }, req, trimmed);

  // Track how many times we've stayed on the same step.
  // If Rosie has now asked the same question three times and the parse still failed,
  // apply a sensible default and move on.
  let stuckCount = state.stuckCount;
  if (state.step !== 'idle' && decision.step === state.step) {
    stuckCount += 1;
  } else {
    stuckCount = 0;
  }

  let movedOn = false;
  if (stuckCount >= 3) {
    if (decision.step === 'asking_time' && !req.endTime) {
      req.endTime = addHoursToTime(req.startTime, 5);
    }
    if (decision.step === 'asking_interests' && req.interests.length === 0) {
      req.interests = ['scenic', 'food'];
    }
    if (decision.step === 'asking_budget' && !req.budget) {
      req.budget = 100;
    }
    if (decision.step === 'asking_meals') {
      askedMeals = true;
    }
    decision = await decideNext({ ...state, request: req, askedMeals }, req, trimmed);
    decision = { ...decision, reply: 'No worries — I will go with what I have. ' + decision.reply };
    stuckCount = 0;
    movedOn = true;
  }

  const finalState: ConvState = {
    ...state,
    step: decision.step,
    request: req,
    askedMeals: decision.markedMealsAsked || movedOn ? true : askedMeals,
    messages: [...messages, rosieMessage(decision.reply)],
    stuckCount
  };

  return {
    state: finalState,
    reply: decision.reply,
    readyToPlan: decision.readyToPlan
  };
}

interface Decision {
  step: ConversationStep;
  reply: string;
  readyToPlan: boolean;
  markedMealsAsked?: boolean;
}

async function decideNext(state: ConvState, req: PlanRequest, lastUserResponse?: string): Promise<Decision> {
  const hasTime = Boolean(req.endTime && req.startTime);
  const hasInterests = req.interests.length > 0;
  const hasBudget = req.budget > 0;

  if (!hasTime) {
    let reply = "How many hours do you have, or until what time would you like to be back?";
    if (lastUserResponse && state.stuckCount > 0) {
      const conversationalReply = await getConversationalReply(
        "time window (hours or end time)",
        lastUserResponse,
        `Guest is planning a day out. Current start time: ${req.startTime}`
      );
      if (conversationalReply) reply = conversationalReply;
    }
    return {
      step: 'asking_time',
      reply,
      readyToPlan: false
    };
  }

  if (!hasInterests) {
    let reply = "What are you in the mood for?";
    if (lastUserResponse && state.stuckCount > 0) {
      const conversationalReply = await getConversationalReply(
        "interests (scenic, food, art, wellness, shopping, outdoors, luxury, family-friendly, tech)",
        lastUserResponse,
        `Guest has ${req.hours ? req.hours + ' hours' : 'a time window'} from ${req.startTime} to ${req.endTime}. Budget: ${req.budget || 'not specified'}`
      );
      if (conversationalReply) reply = conversationalReply;
    }
    return {
      step: 'asking_interests',
      reply,
      readyToPlan: false
    };
  }

  if (!hasBudget) {
    let reply = "Any budget in mind?";
    if (lastUserResponse && state.stuckCount > 0) {
      const conversationalReply = await getConversationalReply(
        "budget (in dollars)",
        lastUserResponse,
        `Guest has ${req.hours || 'a time window'} from ${req.startTime} to ${req.endTime}. Interests: ${req.interests.join(', ')}`
      );
      if (conversationalReply) reply = conversationalReply;
    }
    return {
      step: 'asking_budget',
      reply,
      readyToPlan: false
    };
  }

  if (!state.askedMeals) {
    const meal = detectMealOverlap(req.startTime, req.endTime);
    if (meal.lunch.overlap && !req.includeLunch) {
      return {
        step: 'asking_meals',
        reply: 'Include lunch?',
        readyToPlan: false,
        markedMealsAsked: true
      };
    }
    if (meal.dinner.overlap && !req.includeDinner) {
      return {
        step: 'asking_meals',
        reply: 'Include dinner?',
        readyToPlan: false,
        markedMealsAsked: true
      };
    }
    if (meal.breakfast.overlap && !req.includeBreakfast) {
      return {
        step: 'asking_meals',
        reply: 'Include breakfast?',
        readyToPlan: false,
        markedMealsAsked: true
      };
    }
  }

  return {
    step: 'ready',
    reply: buildReadyReply(req),
    readyToPlan: true
  };
}

function buildReadyReply(req: PlanRequest): string {
  const start = minutesToTime(toMinutes(req.startTime));
  const end = minutesToTime(toMinutes(req.endTime));
  const hours = Math.max(
    1,
    Math.round((toMinutes(req.endTime) - toMinutes(req.startTime)) / 60)
  );
  const interestList =
    req.interests.length > 0 ? req.interests.slice(0, 3).join(', ') : 'a tailored mix';
  const budgetNote = req.budget ? ` under $${req.budget}` : '';
  return `From ${start} to ${end} — ${hours} hours, ${interestList}${budgetNote}. Generating plans.`;
}

export function isComplete(state: ConvState): boolean {
  return state.step === 'ready' || state.step === 'done';
}

export function startOver(): ConvState {
  return initialState();
}

async function parseWithLLM(text: string): Promise<Partial<PlanRequest>> {
  try {
    const r = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!r.ok) return {};
    const data = await r.json();
    return data;
  } catch {
    return {};
  }
}

async function getConversationalReply(
  missingInfo: string,
  userResponse: string,
  context: string
): Promise<string> {
  try {
    const r = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missingInfo, userResponse, context })
    });
    if (!r.ok) return '';
    const data = await r.json();
    return data.reply || '';
  } catch {
    return '';
  }
}
