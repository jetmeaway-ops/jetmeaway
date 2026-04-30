@AGENTS.md

# JetMeAway - Site Overview

JetMeAway (jetmeaway.co.uk) is a travel comparison engine built with Next.js 16, React 19, Tailwind CSS 4, deployed on Vercel Edge. It earns revenue through affiliate commissions — no markups, no booking fees. Contact: waqar@jetmeaway.co.uk

## Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Home — hero, 4-step flight search wizard (destination > dates > passengers > results), category nav, trust section, travel essentials |
| `/flights` | Flight comparison — 250+ airports, live Travelpayouts search with polling, cached Aviasales fallback, 3 providers (Aviasales, Trip.com, Expedia) |
| `/hotels` | Hotel comparison — 160+ cities, Hotellook API, 6 providers (Booking.com, Expedia, Trip.com, Hotels.com, Agoda, Trivago), photo gallery, price grid |
| `/cars` | Car hire — 7 providers (EconomyBookings, QEEQ, LocalRent, GetRentaCar, Klook, Expedia, Trip.com), deep links with search params |
| `/packages` | Holiday packages — curated bundles per destination, 4 providers (Expedia, Trip.com, Booking.com, Klook), price comparison grid |
| `/insurance` | Travel insurance — 4 cover types, 1 provider (Ekta Traveling via Travelpayouts) |
| `/esim` | eSIM data — 150+ countries, 2 providers (Airalo, Yesim — both via Travelpayouts) |
| `/explore` | Activities & tours — 3 providers (GetYourGuide, Viator, Klook) |
| `/about` | Company info, mission, revenue model transparency |
| `/contact` | Contact form, FAQ |
| `/privacy` | Privacy policy, GDPR |
| `/terms` | Terms, affiliate disclosure |

## Components

| Component | Purpose |
|-----------|---------|
| `Header.tsx` | Fixed top nav with glassmorphism, mobile hamburger, category links, mobile sticky category bar (z-[101]) |
| `Footer.tsx` | Dark footer, links, affiliate disclosure, partner logos |
| `DealAlertForm.tsx` | Email signup for deal alerts (saves to Vercel KV) |
| `DiscoverPopup.tsx` | Welcome popup with 12+ curated destinations |

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/flights` | Travelpayouts live flight search + cached Aviasales v3 fallback. Params: origin, destination, departure, return, adults, children, infants, poll |
| `/api/hotels` | Hotellook city lookup + cached hotel prices |
| `/api/subscribe` | POST: save email to Vercel KV. GET: list subscribers |
| `/api/debug` | Health check — tests Travelpayouts token |

## Key Features

- **Geolocation**: Home page auto-detects nearest UK airport (18 airports) for departure
- **Live Flight Search**: Initiates Travelpayouts search, polls for results, falls back to cached API
- **Price Comparison Grids**: Hotels, packages, cars all show per-provider estimated prices with "Cheapest" badge
- **Photo Galleries**: Hotels have multi-photo galleries with CSS scroll-snap and dot indicators
- **Affiliate Deep Links**: Car rental and package links pass search params (location, dates, guests) directly to provider
- **Edge Runtime**: All pages and API routes run on Vercel Edge Functions
- **Vercel KV**: Stores deal alert subscribers and recent search history

## Affiliate Links & Partners

- **Travelpayouts**: Token `f797fbb7074a15838d5536c10be6f7b5`, Marker `714449` — powers Aviasales, Hotellook, and tpk.lu short links
- **Expedia**: `affcid=clbU3QK` — flights, hotels, packages, cars
- **Trip.com**: `Allianceid=8023009`, `SID=303363796`, `trip_sub3=D15021113` — flights, hotels, packages, cars
- **Klook**: `klook.tpk.lu/CByEYa65` — packages, cars
- **Airalo**: `airalo.tpk.lu/MzK1zzie` — eSIM
- **Yesim**: `yesim.tpk.lu/jSzl98ZQ` — eSIM
- **Car Rental** (via Travelpayouts): EconomyBookings, QEEQ, LocalRent, GetRentaCar

## Tech Stack

- Next.js 16.2.2 (App Router, Edge Runtime)
- React 19.2.4
- Tailwind CSS 4 (JIT, requires static full class names)
- TypeScript 5 (strict mode)
- Vercel KV (Redis) for data storage
- Font: Poppins (Google Fonts)
- Icons: Font Awesome 6.5.1 (CDN)

## Design System

- Primary: `#0066FF`
- Text: `#1A1D2B` (heading), `#5C6378` (body), `#8E95A9` (secondary)
- Background: `#F8FAFC` (light), `#0F1119` (dark footer)
- Shadows: blue-tinted `rgba(0,102,255,0.08)`
- Radii: `rounded-xl` / `rounded-2xl` / `rounded-3xl`
- Z-index: header `z-[100]`, category bar `z-[101]`, mobile menu `z-[200]`

## Core Architecture Rules

These are non-negotiable. Read before writing or refactoring any infrastructure-touching code.

- **Vercel Edge Runtime**: All pages and API routes run on Edge. Do not introduce Node-only APIs (`fs`, `child_process`, native modules, Buffer-heavy work). Every new route must declare `export const runtime = 'edge'` or inherit it.
- **Vercel KV is load-bearing**: KV stores deal-alert subscribers, recent search history, the unified bookings store, and the bug inbox. It backs at most 3 active searches at a time per session — do not expand that footprint without an explicit owner decision. Treat KV writes as a hot path; batch where possible.
- **Privacy Shield**: Never log, persist, or transmit PII (names, emails, phone, payment data, passport details) outside the booking pipeline. No PII in URL params, no PII in analytics events, no PII in error reports / bug-monitor payloads. Sanitise before `reportBug()` and before any third-party call.
- **Stripe is for Duffel (flights) only**: Stripe is the MoR payment rail exclusively for Duffel flight bookings. LiteAPI hotels use LiteAPI's direct payment system — do NOT route LiteAPI bookings through Stripe. Webbeds is not active. Never log raw card data, never persist PaymentIntent secrets to KV, all 3DS2 flows stay client-side, refunds only via the admin route.
- **NEVER change the database / KV variable structure without double-checking the current codebase first.** Key names, value shapes, and stored field names in Vercel KV (e.g. `bookings:all`, `pending-booking:*`, subscriber records) are referenced from many call sites including the Twilio IVR booking lookup, admin pages, and webhook handlers. Before renaming a key, changing a field, or altering a stored shape: grep the entire repo for every read/write site, list them, and confirm the migration path. A silent shape change has broken booking lookup before — do not repeat.

## Important Notes

- This is a comparison engine only — bookings happen on partner sites
- Never remove affiliate tracking params from links
- Only show providers we have affiliate relationships with
- Unsplash CDN for all hotel/package photos (Hotellook CDN is dead)
- `.next` folder can get EPERM lock errors — fix with `rm -rf .next`
