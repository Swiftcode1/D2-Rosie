import { HOTEL } from '@/data/places';

export default function Header() {
  return (
    <header className="relative border-b border-charcoal-700/10 bg-cream-50">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1800&q=80&auto=format&fit=crop')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream-50/90 via-cream-50/70 to-cream-50" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="flex items-center gap-3 text-gold-400">
            <span className="inline-block h-px w-10 bg-gold-300" />
            <span className="text-[10px] uppercase tracking-[0.4em]">A Sense of Place</span>
            <span className="inline-block h-px w-10 bg-gold-300" />
          </div>

          <h1 className="mt-8 wordmark text-5xl text-charcoal-700 sm:text-7xl">
            Rosie
          </h1>

          <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-charcoal-500">
            <span className="inline-block h-px w-8 bg-charcoal-700/30" />
            <span>The voice-first concierge</span>
            <span className="inline-block h-px w-8 bg-charcoal-700/30" />
          </div>

          <p className="mt-8 max-w-xl font-serif text-2xl italic leading-snug text-charcoal-600 sm:text-3xl">
            Curated days in {HOTEL.city}, designed in the spirit of {HOTEL.name}.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 border-t border-charcoal-700/15 pt-4 text-[10px] uppercase tracking-[0.3em] text-charcoal-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rosie-500" />
            In residence · {HOTEL.name}
          </div>
        </div>
      </div>
    </header>
  );
}
