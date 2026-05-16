import { HOTEL } from '@/data/places';

export default function Header() {
  return (
    <header className="relative overflow-hidden border-b border-rosie-100/60 bg-gradient-to-b from-cream-50 via-cream-50 to-cream-100">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-rosie-100/60 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gold-100/70 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="flex items-center gap-3 text-gold-500">
          <span className="inline-block h-px w-10 bg-gold-300" />
          <span className="text-xs uppercase tracking-[0.3em]">Concierge Suite</span>
        </div>
        <h1 className="mt-4 font-serif text-5xl text-charcoal-700 sm:text-6xl">
          Rosie<span className="text-rosie-500">.</span>
        </h1>
        <p className="mt-3 max-w-xl text-lg text-charcoal-500">
          Your voice-first AI concierge at {HOTEL.name}.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-rosie-100 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-wider text-charcoal-400 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rosie-400" />
          Planning from {HOTEL.name}, {HOTEL.city}
        </div>
      </div>
    </header>
  );
}
