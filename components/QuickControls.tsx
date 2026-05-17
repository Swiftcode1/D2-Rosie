'use client';

import type { Interest, PlanRequest } from '@/types';

interface Props {
  request: PlanRequest;
  onSetHours: (hours: number) => void;
  onToggleInterest: (i: Interest) => void;
  onSetBudget: (b: number) => void;
  onSetWalking: (w: 'low' | 'medium' | 'high') => void;
}

const QUICK_HOURS = [2, 3, 5, 8];
const QUICK_INTERESTS: Interest[] = [
  'scenic',
  'food',
  'art',
  'shopping',
  'wellness',
  'outdoors',
  'luxury',
  'family-friendly',
  'tech'
];
const QUICK_BUDGETS = [50, 80, 150, 300];

export default function QuickControls({
  request,
  onSetHours,
  onToggleInterest,
  onSetBudget,
  onSetWalking
}: Props) {
  return (
    <section className="border-b border-[color:var(--line)] bg-white">
      <div className="mx-auto max-w-[1100px] px-8 py-20 sm:px-14 sm:py-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Adjust</div>
            <h2 className="mt-4 font-serif text-3xl font-light text-[color:var(--ink)] sm:text-4xl">
              A discreet tap is all it takes
            </h2>
          </div>
        </div>

        <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <Group label="How long">
            {QUICK_HOURS.map((h) => (
              <Chip key={h} onClick={() => onSetHours(h)}>
                {h} hours
              </Chip>
            ))}
          </Group>

          <Group label="Budget">
            {QUICK_BUDGETS.map((b) => (
              <Chip key={b} active={request.budget === b} onClick={() => onSetBudget(b)}>
                ${b}
              </Chip>
            ))}
          </Group>

          <Group label="Walking">
            {(['low', 'medium', 'high'] as const).map((w) => (
              <Chip
                key={w}
                active={request.walkingTolerance === w}
                onClick={() => onSetWalking(w)}
              >
                {w === 'low' ? 'Less' : w === 'high' ? 'Lots' : 'Some'}
              </Chip>
            ))}
          </Group>

          <Group label="Interests" wide>
            {QUICK_INTERESTS.map((i) => (
              <Chip
                key={i}
                active={request.interests.includes(i)}
                onClick={() => onToggleInterest(i)}
              >
                {i}
              </Chip>
            ))}
          </Group>
        </div>
      </div>
    </section>
  );
}

function Group({
  label,
  children,
  wide
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-1' : ''}>
      <div className="eyebrow">{label}</div>
      <div className="mt-5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  active
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`border px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
        active
          ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-white'
          : 'border-[color:var(--line)] bg-white text-[color:var(--ink)] hover:border-[color:var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}
