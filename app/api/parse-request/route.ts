import { NextResponse } from 'next/server';
import type { Interest, PlanRequest, Transportation, TravelStyle } from '@/types';
import { parseFreeText } from '@/lib/planner';

export const runtime = 'nodejs';

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

const TRANSPORTATION: Transportation[] = ['walking', 'rideshare', 'driving', 'hotel shuttle'];
const PACES: TravelStyle[] = ['relaxed', 'balanced', 'ambitious'];
const WALKING = ['low', 'medium', 'high'] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const parseSchema = {
  name: 'rosie_request_patch',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['understood', 'confidence', 'reason', 'patch'],
    properties: {
      understood: { type: 'boolean' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reason: { type: 'string' },
      patch: {
        type: 'object',
        additionalProperties: false,
        required: [
          'startTime',
          'endTime',
          'hours',
          'budget',
          'stops',
          'transportation',
          'interests',
          'pace',
          'walkingTolerance',
          'includeBreakfast',
          'includeLunch',
          'includeDinner',
          'rawText'
        ],
        properties: {
          startTime: {
            anyOf: [{ type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }, { type: 'null' }]
          },
          endTime: {
            anyOf: [{ type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }, { type: 'null' }]
          },
          hours: { anyOf: [{ type: 'number', minimum: 0.5, maximum: 14 }, { type: 'null' }] },
          budget: { anyOf: [{ type: 'integer', minimum: 1, maximum: 2000 }, { type: 'null' }] },
          stops: { anyOf: [{ type: 'integer', minimum: 1, maximum: 6 }, { type: 'null' }] },
          transportation: {
            anyOf: [{ type: 'string', enum: TRANSPORTATION }, { type: 'null' }]
          },
          interests: {
            type: 'array',
            items: { type: 'string', enum: INTERESTS }
          },
          pace: { anyOf: [{ type: 'string', enum: PACES }, { type: 'null' }] },
          walkingTolerance: {
            anyOf: [{ type: 'string', enum: WALKING }, { type: 'null' }]
          },
          includeBreakfast: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
          includeLunch: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
          includeDinner: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
          rawText: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        }
      }
    }
  }
};

type ParseBody = {
  text?: string;
  currentRequest?: PlanRequest;
  currentStep?: string;
  localTime?: string;
  conversation?: Array<{ speaker: string; text: string }>;
};

type ParseResponse = {
  source: 'openai' | 'local-fallback';
  understood: boolean;
  confidence: number;
  reason: string;
  patch: Partial<PlanRequest>;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ParseBody | null;
  const text = body?.text?.trim() || '';

  if (!text) {
    return NextResponse.json(
      {
        source: 'local-fallback',
        understood: false,
        confidence: 0,
        reason: 'No guest utterance was provided.',
        patch: {}
      } satisfies ParseResponse,
      { status: 400 }
    );
  }

  const fallback = buildFallback(text);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: parseSchema
        },
        messages: [
          {
            role: 'system',
            content: systemPrompt()
          },
          {
            role: 'user',
            content: JSON.stringify({
              guestUtterance: text,
              currentStep: body?.currentStep || 'unknown',
              localTime: body?.localTime || null,
              currentRequest: body?.currentRequest || null,
              recentConversation: (body?.conversation || []).slice(-8)
            })
          }
        ]
      })
    });

    if (!response.ok) {
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json(fallback);

    const parsed = JSON.parse(content);
    const patch = sanitizePatch(parsed?.patch, text);

    return NextResponse.json({
      source: 'openai',
      understood: Boolean(parsed?.understood),
      confidence: clampNumber(parsed?.confidence, 0, 1, 0.7),
      reason: typeof parsed?.reason === 'string' ? parsed.reason.slice(0, 240) : 'Parsed with OpenAI.',
      patch
    } satisfies ParseResponse);
  } catch {
    return NextResponse.json(fallback);
  }
}

function systemPrompt() {
  return [
    'You are Rosie, a luxury hotel concierge parser for Rosewood Sand Hill.',
    'Convert noisy speech-to-text guest replies into a structured patch for a deterministic itinerary planner.',
    'Return only fields the guest clearly supplied or strongly implied. Use null for unknown scalar fields and [] for no new interests.',
    'Do not invent places, route stops, or itinerary items. You only normalize input into fields.',
    'Times must be 24-hour HH:MM local hotel time. If the guest says "8 pm", use "20:00". If the guest says "five hours", set hours: 5.',
    'For vague budgets: "cheap" or "tight" means budget 40; "reasonable" or "nothing crazy" means 100; "premium" means 250; "no budget" or "splurge" means 500.',
    'For vague interests: "open to everything", "surprise me", "a mix", or "you decide" means interests ["scenic","food","art","outdoors","wellness"].',
    'Map "less walking", "tired", "feet hurt", "low energy" to walkingTolerance "low". Map "active" or "want exercise" to "high".',
    'Meal flags should reflect direct intent: "include lunch", "I am hungry", "grab a bite" -> includeLunch true if lunch is plausible; "already ate" or "not hungry" -> relevant meal false.',
    'If the guest is answering a yes/no meal question, set the relevant includeBreakfast/includeLunch/includeDinner field when clear.',
    'Allowed interests: food, outdoors, shopping, art, family-friendly, luxury, nightlife, wellness, tech, scenic.',
    'Allowed transportation: walking, rideshare, driving, hotel shuttle.',
    'Allowed pace: relaxed, balanced, ambitious.'
  ].join('\n');
}

function buildFallback(text: string): ParseResponse {
  return {
    source: 'local-fallback',
    understood: true,
    confidence: 0.45,
    reason: 'OpenAI parsing is unavailable, so Rosie used the local parser.',
    patch: sanitizePatch(parseFreeText(text), text)
  };
}

function sanitizePatch(input: unknown, rawText: string): Partial<PlanRequest> {
  const source = (input || {}) as Partial<PlanRequest>;
  const out: Partial<PlanRequest> = { rawText };

  if (typeof source.startTime === 'string' && TIME_PATTERN.test(source.startTime)) {
    out.startTime = source.startTime;
  }
  if (typeof source.endTime === 'string' && TIME_PATTERN.test(source.endTime)) {
    out.endTime = source.endTime;
  }
  if (typeof source.hours === 'number' && source.hours >= 0.5 && source.hours <= 14) {
    out.hours = Math.round(source.hours * 2) / 2;
  }
  if (typeof source.budget === 'number' && source.budget > 0) {
    out.budget = Math.min(2000, Math.round(source.budget));
  }
  if (typeof source.stops === 'number' && source.stops >= 1 && source.stops <= 6) {
    out.stops = Math.round(source.stops);
  }
  if (typeof source.transportation === 'string' && TRANSPORTATION.includes(source.transportation as Transportation)) {
    out.transportation = source.transportation as Transportation;
  }
  if (Array.isArray(source.interests)) {
    const interests = source.interests.filter((x): x is Interest => INTERESTS.includes(x as Interest));
    if (interests.length > 0) out.interests = Array.from(new Set(interests));
  }
  if (typeof source.pace === 'string' && PACES.includes(source.pace as TravelStyle)) {
    out.pace = source.pace as TravelStyle;
  }
  if (typeof source.walkingTolerance === 'string' && WALKING.includes(source.walkingTolerance as any)) {
    out.walkingTolerance = source.walkingTolerance as PlanRequest['walkingTolerance'];
  }
  if (typeof source.includeBreakfast === 'boolean') out.includeBreakfast = source.includeBreakfast;
  if (typeof source.includeLunch === 'boolean') out.includeLunch = source.includeLunch;
  if (typeof source.includeDinner === 'boolean') out.includeDinner = source.includeDinner;

  return out;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
