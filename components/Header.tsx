'use client';

import { useEffect, useState } from 'react';
import { HOTEL } from '@/data/places';

export default function Header() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <header className="border-b border-[color:var(--line)] bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6 sm:px-14">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl tracking-[0.35em] text-[color:var(--ink)]">
            ROSIE
          </span>
        </div>
        <div className="hidden text-center sm:block">
          <div className="eyebrow">{HOTEL.name}</div>
          <div className="mt-1 text-xs text-[color:var(--ink-soft)]">{HOTEL.city}, California</div>
        </div>
        <div className="text-right">
          <div className="font-serif text-2xl text-[color:var(--ink)]">{timeLabel}</div>
        </div>
      </div>
    </header>
  );
}
