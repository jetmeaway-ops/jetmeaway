# Scout Implementation Plan

Written 15 April 2026. Plan to turn the four Scout pillars (Eyes, Engine, Shield, Negotiator) from manifesto into working features on jetmeaway.co.uk.

## Starting position

Already live: Vercel Edge runtime on every route, Vercel KV caching on flight and hotel searches, Stripe merchant of record payment flow, Stripe Radar enabled at default level, LiteAPI hotels live, Duffel flights live, Webbeds contract signed 14 April awaiting API keys (~1 month).

Already partial: per-user recent intents in KV, minimal PII storage, proxy-style architecture (server-rendered means supplier calls never leave the browser).

Not yet built: Giata-based supplier de-duplication, wellness neighbourhood layer, formal privacy audit, Scout Philosophy page, custom Stripe Radar rules.

## Phase 1 — Giata de-duplication (Week 1, ~3 days)

The foundation. Without this, Webbeds and LiteAPI return the same hotel twice with different names, prices and photos.

Steps. Build `src/lib/giata.ts` with a `resolveGiataId(supplier, supplierHotelId)` function. Pull the free Giata multi-codes mapping file on first request, cache in KV for 30 days. When a hotel search returns from Webbeds or LiteAPI, normalise every result onto its Giata code. Merge results keyed by Giata, pick the cheapest rate across suppliers as the lead price, keep both supplier offers attached so the user can still see the comparison. Add a `giataId` field to every hotel card in the search results.

Deliverable. Users see one clean hotel entry per physical property, with a "best price from X of Y suppliers" badge. Cheaper price wins.

Blocks. Webbeds API access first. Cannot be fully tested until we have their test credentials in ~3 weeks.

Parallel work. Build it against LiteAPI-only data now, structured so Webbeds slots in by just adding a second supplier adapter.

## Phase 2 — Wellness neighbourhood layer (Week 2, ~5 days)

This is the Scout feature. Users see a sidebar on every hotel page showing the 24-hour ecosystem around the property.

Steps. Sign up for Google Places API with a hard spending cap of £50/month initially. Build `src/lib/scout-neighbourhood.ts` that takes a hotel lat/lng and returns five categories: morning coffee (opens before 7am), fitness (gym, yoga, CrossFit), wellness (cold plunge, spa, organic grocer), food (restaurants rated 4.3+), transport (metro, airport rail). Cache results in KV for 7 days per lat/lng rounded to 4 decimal places. Render in a right-rail sidebar on the hotel detail page, collapsed on mobile.

Deliverable. Every hotel page has a real, data-backed "Scout Report" panel. This is what we show in investor demos.

Cost control. 5 categories × average 3 hotels viewed per session × 20 sessions a day = 300 Places calls a day worst case. Google charges roughly $0.017 per call = $5.10/day. Heavy caching brings that down by 80%+. Budget £50/month is safe.

## Phase 3 — Privacy Shield hardening (Week 3, ~2 days)

Mostly documentation and audit, not new code. Turn what we already do into a proper public position.

Steps. Audit every supplier call, confirm we never forward user email or phone unless required for the booking itself. Write a one-page data retention policy and link it from the footer. Add a Scout Philosophy page at `/scout` summarising all four pillars in plain language plus the "scout prepares the terrain" tagline. Configure Stripe Radar custom rules: block when billing country mismatches card country, flag transactions over £2,000, block known high-risk BIN ranges.

Deliverable. Public `/scout` page that doubles as an investor pitch artefact. Tightened Radar reduces chargeback risk before Webbeds goes live.

## Phase 4 — Anticipatory intents (Week 3–4, ~2 days)

Scout remembers the last three searches per user and pre-warms results on app/site open.

Steps. Already storing recent searches in KV under `recent:{sessionId}`. Extend to fetch top 3 on homepage load, kick off background search for each, populate the cache so when the user clicks one the results are instant. Add a "Pick up where you left off" row on the homepage below the hero.

Deliverable. Returning users see their intents waiting for them. Feels magical, costs almost nothing because searches are already cached server-side.

## Phase 5 — Polish and measurement (Week 4 onwards)

Instrument everything with Vercel Analytics so we can prove the Scout features move the needle. Specifically track: hotel detail page time-on-page before vs after Scout sidebar ships, booking conversion rate on pages with full Scout reports vs pages with partial data, returning-user rate once anticipatory intents are live.

## Order of attack

Week 1. Giata de-duplication against LiteAPI data. Scaffold Webbeds adapter so it slots in when keys arrive.

Week 2. Wellness neighbourhood layer against Google Places. Launch on hotel detail pages.

Week 3. Privacy audit, Scout Philosophy page, Stripe Radar rules.

Week 4. Anticipatory intents. Analytics instrumentation.

Week 5 onwards. Webbeds test credentials arrive around this point. Plug them into the existing Giata normaliser, test in sandbox, go live.

## Dependencies and blockers

Google Places API account needed for Phase 2. Can be created today, takes 30 minutes.

Webbeds test credentials block full Phase 1 validation but not initial build. ~3 weeks out.

Giata multi-codes file access. Free for development, check licensing for production use. Need to confirm before Phase 1 goes live.

No other external blockers.

## Estimated total build time

14 working days across 4–5 calendar weeks, depending on other commitments. Critical path runs through Giata (Phase 1) because Webbeds integration depends on it.
