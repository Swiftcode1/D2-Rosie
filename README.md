# D2-Rosie — Voice-first AI Concierge for Rosewood Sand Hill

D2-Rosie is a hackathon MVP of a voice-first AI hotel concierge built for **Rosewood Sand Hill** in Menlo Park, CA. A guest speaks (or types) what they want to do, and Rosie produces three realistic itineraries — Relaxed, Balanced, and Packed — anchored on the hotel as the origin and return point.

This is built to demo end-to-end without any API keys.

---

## What Rosie does

- Listens to a guest's request (voice via browser SpeechRecognition + browser TTS; or typed)
- Parses the request (time window, budget, walking tolerance, interests, meal preference)
- Detects whether the itinerary overlaps breakfast, lunch, or dinner — and offers toggles
- Generates **three** itineraries from a curated, hand-vetted set of 18+ real places near the hotel
- Scores each place by interest match, review quality, distance, price fit, and hotel relevance
- Always includes return-to-hotel and a return buffer (Rosie won't make a guest run late)
- Surfaces images, timeline, route preview, total cost, total time, warnings, and an explanation
- Hands off to the front desk: reserve, send-to-front-desk, save, share QR, open in maps

## Hackathon demo flow

1. Open the app — the seed prompt is pre-loaded:
   > "I have 5 hours from 10 AM to 3 PM, want something scenic and local, include lunch, less walking, under $80."
2. Click **Plan my itinerary** — three plans appear instantly.
3. Try the **microphone** button (Chrome / Edge support browser voice recognition out of the box).
4. Tweak the **guest profile** (interests, walking tolerance, budget) → re-plan to see Rosie adapt.
5. On any plan card, click **Send to front desk** to see the mock concierge handoff modal.
6. Click **Share QR** to get a scannable QR pointing at the Google Maps multi-stop route.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The base demo requires **no API keys**.

## Adding real APIs

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
ELEVENLABS_API_KEY=
OPENAI_API_KEY=
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### ElevenLabs Conversational AI
- Add `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` and `ELEVENLABS_API_KEY`.
- The voice panel detects the agent ID and shows it as connected — wire in the ElevenLabs Conversational AI widget or SDK inside `components/VoiceConcierge.tsx`.

### Google Maps
- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to swap the styled route preview in `components/MapPreview.tsx` with the real `@react-google-maps/api` embed.
- "Open in Google Maps" already works without a key — it builds a multi-stop directions URL.

### OpenAI
- Add `OPENAI_API_KEY` to optionally call an LLM for richer, longer assistant replies and clarifying questions. The MVP keeps planning **fully deterministic** so plans never hallucinate places — the LLM should only narrate and explain.

### Supabase
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to persist guest profiles and itinerary history across devices instead of just `localStorage`.

## What is mocked

- **Places data** — hand-curated in `data/places.ts` (Stanford Dish, Cantor Arts, Filoli, Madera, etc.) with realistic categories, durations, costs, and review signals.
- **Voice** — uses browser `SpeechRecognition` and `speechSynthesis` as a stand-in until ElevenLabs Conversational AI is wired.
- **Map** — a stylized SVG-ish route preview that already builds a real Google Maps URL behind the "Open in Google Maps" button.
- **Front desk handoff** — a polished modal that shows what the request would look like.
- **Guest profile** — persisted in `localStorage` (no backend required).

## What would be productionized later

- ElevenLabs Conversational AI agent embedded in `VoiceConcierge.tsx` for true voice in / voice out
- Live Google Places / Maps lookups, real hours, real travel times, real photos
- Live restaurant booking via OpenTable / Resy / SevenRooms
- Supabase-backed guest profiles, itinerary history, and front-desk inbox
- PMS integration (Opera / Mews) to pull room number, check-out time, and dining preferences
- LLM-driven clarifying questions ("How many in your party?", "Any allergies?")
- Multi-language support for international guests

## Project structure

```
app/
  layout.tsx
  page.tsx
  globals.css
components/
  Header.tsx
  VoiceConcierge.tsx
  GuestProfileCard.tsx
  PlanningPanel.tsx
  MealTogglePanel.tsx
  ItineraryResults.tsx
  ItineraryCard.tsx
  Timeline.tsx
  MapPreview.tsx
  HotelHandoffModal.tsx
lib/
  planner.ts
  mealLogic.ts
  profileStorage.ts
data/
  places.ts
types/
  index.ts
.env.example
```

## Acceptance criteria

- `npm install && npm run dev` runs locally with no API keys
- Voice input via browser, or typed fallback
- Guest profile saves/loads/clears via localStorage
- Meal window detection with togglable include-breakfast/lunch/dinner
- Three plans (Relaxed / Balanced / Packed) with images, timeline, costs, travel times, explanations, and route preview
- "Send to front desk" creates a mock concierge request card
- Polished, luxury hotel feel — cream, rose, gold, serif headings

---

Built for a hackathon. Mock-first, demo-ready, easy to extend.
