# PREMIUM PLAN V3 — Hotels search quality-of-life

Saved 2026-04-21. Survives session compaction. Four scoped shippable pieces.

## Scope (from user, 2026-04-21)

1. **Nearby hotels on first load** — no-params `/hotels` should geolocate and auto-search.
2. **Map alongside the list** — not a toggle. Pin ↔ card highlight.
3. **Area search for big cities** — London → Victoria, Paddington, Hammersmith, Westminster in the autocomplete.
4. **Nearest airport, not hardcoded Heathrow** — Gatwick-adjacent hotels must say "X mi from LGW", not LHR.

## Root-cause diagnosis

### Airport distance bug (item 4)
- `src/app/hotels/hotels-client.tsx:112` — `AIRPORT_COORDS` is a 1-airport-per-city list (`london → LHR`).
- `src/app/hotels/hotels-client.tsx:233` — `findAirport(dest)` returns the first match for the **searched** destination, reused for every card.
- `src/app/hotels/hotels-client.tsx:775` — card measures Haversine from hotel → that single airport.
- Result: Gatwick hotel shows miles-from-Heathrow because LHR is the only London candidate.

### Neighbourhoods (item 3)
- `src/app/api/hotels/places/route.ts` → `getPlaces` queries LiteAPI `/data/places?type=locality,airport,hotel`.
- Missing `neighborhood,sublocality` types. Also LiteAPI coverage of neighbourhoods is inconsistent — need a curated fallback for UK tier-1 cities.

### Geolocation on load (item 1)
- `hotels-client.tsx:1439-1457` reads URL params only. No `navigator.geolocation` call.
- Homepage already has the nearest-airport pattern — mirror that shape.

### Map layout (item 2)
- `hotels-client.tsx:2039-2054` has a List/Map toggle.
- `HotelMap.tsx` already consumes lat/lng; pins render with price pills.
- Change is layout + a couple of callbacks (onHoverPin, onHoverCard) for bidirectional highlight.

## Execution order (low-risk first)

### Step 1 — Nearest airport (item 4)
- Expand `AIRPORT_COORDS` to allow multiple airports per city label.
- New `findCandidateAirports(dest)` → returns an **array** of candidates for the metro.
- Card computes nearest candidate by Haversine, labels with its IATA.
- London candidates: LHR, LGW, STN, LTN, LCY
- Paris: CDG, ORY, BVA
- NYC: JFK, LGA, EWR
- Milan: MXP, LIN, BGY
- Rome: FCO, CIA
- Tokyo: HND, NRT
- Berlin: BER (single)
- Moscow: SVO, DME, VKO
- Also add per-hotel override so a standalone airport place (e.g. the user literally searched "Gatwick") starts with that airport as highest-priority candidate.

**Files touched:** `hotels-client.tsx` only. No API changes.

### Step 2 — Neighbourhoods in autocomplete (item 3)
- `getPlaces` → add `neighborhood,sublocality` to the type filter.
- New `src/lib/neighbourhoods.ts` — curated list for London/Manchester/Edinburgh/Birmingham/Dublin/Glasgow. Each entry: `{ slug, parent, name, lat, lng, radiusKm }`.
- `places/route.ts` merges LiteAPI results + curated neighbourhoods (filtered by substring). LiteAPI wins on dedupe (same name + parent).
- DestinationPicker renders a neighbourhood icon (fa-location-dot) for neighbourhood entries.
- When a neighbourhood is selected, search passes its lat/lng to `/api/hotels` so results bias toward that area.

**Files touched:** `src/lib/neighbourhoods.ts` (new), `liteapi.ts`, `places/route.ts`, `hotels-client.tsx` DestinationPicker.

### Step 3 — Geolocation on load (item 1)
- `hotels-client.tsx` top-level effect: if no URL params AND no saved search, call `navigator.geolocation.getCurrentPosition`.
- Reverse-geocode via a tiny new `/api/hotels/reverse-geocode` that wraps LiteAPI or OSM Nominatim.
- Prefill destination, run search.
- Respect user preference — cache last-chosen destination in `sessionStorage`; geolocate only once per session.

**Files touched:** `hotels-client.tsx`, new `src/app/api/hotels/reverse-geocode/route.ts`.

### Step 4 — Split-view map + list (item 2)
- Desktop ≥1024px: 2-column, list left (60%), map right (40%) sticky top-28, full-viewport-height minus header.
- Mobile/tablet: keep the existing toggle.
- Bidirectional highlight: `HotelMap` accepts `activeHotelId` prop + `onPinHover(id)` / `onPinClick(id)`. Card grid scrolls active into view.
- Map auto-fits bounds to visible/filtered results.
- No new libraries — Leaflet already there.

**Files touched:** `hotels-client.tsx` results section, `HotelMap.tsx`.

### Step 5 — Final checks
- `tsc --noEmit` clean
- `next build` clean
- Smoke in preview: search London → see neighbourhoods + see hotels with mixed LHR/LGW/STN labels → toggle map → hover card → pin highlights.

## Files touched summary

| File | Steps |
|---|---|
| `src/app/hotels/hotels-client.tsx` | 1, 2, 3, 4 |
| `src/components/HotelMap.tsx` | 4 |
| `src/lib/liteapi.ts` | 2 |
| `src/app/api/hotels/places/route.ts` | 2 |
| `src/lib/neighbourhoods.ts` (new) | 2 |
| `src/app/api/hotels/reverse-geocode/route.ts` (new) | 3 |

## Out of scope
- No backend search-bias by neighbourhood bounds — Step 2 just passes lat/lng to existing search flow; geo-filtering server-side can wait.
- No map clustering — we typically render ≤50 hotels per page, Leaflet handles that unclustered.
- No user consent UI for geolocation — browser prompt is enough for now; dismissal falls back to current empty-state behaviour.
