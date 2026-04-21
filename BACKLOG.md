# JetMeAway — Rolling Backlog

**Working rules (set by user, 2026-04-21):**
> 1. When the user mentions a new thing mid-session, save it to this file first. Do **not** context-switch. Finish the current plan, then pick the next item off this backlog. This stops work getting abandoned halfway.
> 2. Before showing a preview to the user, save the work first — BACKLOG.md for queue state + a `PREMIUM_PLAN_Vn.md` file for the executed plan. Anything done must exist on disk as a plan **before** the preview goes up, so context compaction can't lose it.
> 3. One push per day — batch all daily work into a single commit + push to conserve Vercel build minutes.

Items move top → bottom as they ship: `NEXT UP` → `IN FLIGHT` → `DONE`. Oldest done entries stay for a few days for traceability, then they move out to the session memory files in `.claude/projects/.../memory/`.

**Plan index:**
- `PREMIUM_PLAN_V2.md` — My Account + hotel detail polish (2026-04-21)
- `PREMIUM_PLAN_V3.md` — Hotels search quality-of-life (2026-04-21)
- `PREMIUM_PLAN_V4.md` — Backlog drain: date-strip gate + Reviews tab + self-service cancel (2026-04-21)
- `PREMIUM_PLAN_V5.md` — Hotel detail: Reviews-count prominence + Back-to-search button (2026-04-21)

---

## IN FLIGHT

### M1. Mobile app — icon mismatch fix (Play Store rejected 2026-04-21)
Build complete 2026-04-21 (1.0.2 v12 — Expo build `7d908219`). **Awaiting user to upload AAB to Play Console.** Full state in `mobile/MOBILE_LOG.md`.
- [x] Canonical raster from user's actual logo (`public/Jetmeaway logo for app.jpeg` → `mobile/assets/brand/icon-canonical.png`)
- [x] Old SVGs + hand-drawn attempts archived as `*.archive.svg`
- [x] PNGs regenerated via `mobile/scripts/regen-icons.mjs` (icon.png 1024, adaptive-icon.png 1024, play-store-icon-512.png 512)
- [x] `eas.json` hardened — `requireCommit: true` (OneDrive workaround) + `appVersionSource: "remote"`
- [x] SDK 54 dependency alignment via `npx expo install --fix` (17/17 doctor green)
- [x] `eas build --platform android --profile production` — build 4 (v12) SUCCESS
- [ ] Download AAB + upload to Play Console
- [ ] Re-upload 512×512 hi-res icon in Main store listing
- [ ] Submit for review

---

## NEXT UP — queued, not started

### M2. Mobile icon clipping test (post EAS build 1.0.2)
- [ ] Sideload or install the 1.0.2 AAB on a real Android device.
- [ ] Check launcher under circle + squircle + rounded-square masks (Pixel, Samsung, OnePlus skins vary).
- [ ] If the gold crescent or plane wing looks shaved at any edge → add an 8% inset to `mobile/scripts/regen-icons.mjs` (wrap canonical logo in a transparent margin before output), regen, bump `versionCode` to 4, rebuild.
- [ ] If no clipping visible on the main test device → no-op, ship as-is.

---

## DONE (recent)

### V6 — Magic-link dotted-email fix + SESSION_SECRET live — 2026-04-21
Hotfix after first live sign-in attempt returned `/account?error=expired` even on fresh links.

1. **Root cause in `src/lib/session.ts`.** `verifyToken()` was doing `token.split('.')` and requiring `parts.length === 4`. Token format is `{purpose}.{email}.{expiry}.{sig}` — but every email domain contains at least one `.` (`@gmail.com`, `@foo.co.uk`), so any real user produced 5+ parts and failed the length check. UI rendered that as "expired".
2. **Fix.** Parse from the known ends: purpose = first part (no dots), sig = last (base64url, `.` → `_`), expiry = second-to-last (digits only), email = everything between rejoined with `.`. `tsc --noEmit` clean.
3. **Infra.** `SESSION_SECRET` (48 bytes, base64url, sensitive, Production + Preview) added in Vercel. Redeploy `7qevZn6mo` picked it up; `/account` now renders without 500.

Commit: `ee7aabc fix(auth): magic-link verify handles emails with dotted domains`. Pushed as a solo fix — cost-cadence broken once, justified by broken auth on prod.

### M1. Mobile app — icon mismatch fix — BUILT 2026-04-21
1.0.2 (versionCode 12, build `7d908219-decd-4c52-9b09-0931d771ec2f`) — ✅ Finished, AAB ready for download.

Trail of fixes to get there: `.easignore` rewrite → `cli.requireCommit: true` (OneDrive NTFS workaround) → `npx expo install --fix` (SDK 54 dependency alignment; fixed `enableBundleCompression` gradle crash).

Next: user downloads AAB → Play Console upload → re-upload 512×512 hi-res icon → submit for review.

### V5 — Hotel detail: Reviews-count prominence + Back-to-search button — 2026-04-21
Saved plan: `PREMIUM_PLAN_V5.md`.

1. **Reviews-count prominence (Booking.com-style).** In `src/app/hotels/[id]/page.tsx` the old muted "Based on {n} reviews" caption was promoted to a first-class number in the score tile header ("{count} reviews" at .82rem black #0a1628 + "Verified guests" uppercase micro-label), and a bordered footer strip was added beneath the review cards list: "Showing X of **Y** verified guest reviews" on the left, average score badge on the right — mirrors Booking.com's pattern of re-stating the full review corpus beneath the visible cards so users see the depth, not just the 5 we render. Footer only shows when `reviews.count > 0`.
2. **"Back to search results" button on hotel detail.** User feedback: browser back on `/hotels/[id]` lands on the empty `/hotels` state because the landing page is fully client-driven. Added a prominent pill above the breadcrumb that carries `destination, checkin, checkout, adults, children, rooms` back to `/hotels?…`. `hotels-client.tsx` already reads these on mount (line 1599) and `autoSearched` ref (line 1831) auto-fires `handleSearch` as soon as dest+dates are set, so the search results rehydrate without user action. Button label reads "Back to search in {city}" when we know the city, else "Back to search results". Falls back to `/hotels` when we have no params. Breadcrumb back-links remain as a secondary path.

**Verification:** `tsc --noEmit` clean.



### V4 — Backlog drain: strip gate + Reviews tab + self-service cancel — 2026-04-21
Saved plan: `PREMIUM_PLAN_V4.md`.

1. **B1. Date-strip fill-or-kill.** Added a coverage gate in `src/app/hotels/hotels-client.tsx` — the `DateMatrixStrip` only renders when at least 6 of 7 cells have a real price (Hotellook cache). Loading skeleton still shows during fetch. On sparse cities the strip silently disappears rather than rendering half-filled, honouring user's "half-filled looks worse than no strip" rule. Zero new API cost.
2. **B2. Reviews tab on hotel detail page.** New `getHotelReviews()` in `src/lib/liteapi.ts` calls LiteAPI `/data/reviews?hotelId=X&limit=8` in parallel with the main `/data/hotel` fetch. Extended `HotelDetails` with `reviews: { averageScore, count, list }`. Bumped details cache to `v4`. Added `Reviews` to the anchor sub-nav and a new `<section id="reviews">` between Facilities and Location — shows score tile + label (Superb/Very good/etc.), count, up to 5 most-recent reviews with country/type/date/language chip + headline + pros/cons. Falls back to a "No reviews yet" state — **tab is never hidden** per ship rule. Files: `liteapi.ts`, `api/hotels/details/[id]/route.ts`, `app/hotels/[id]/page.tsx`.
3. **B3. My Trips amendment flow — cancellation.** Added `cancellationDeadline` to `Booking` in `src/lib/bookings.ts`; populated in `mirrorToUnified()` on book. New `POST /api/account/bookings/cancel` — 3-gate check (session ownership, `supplier === 'liteapi'`, deadline still in the future) before calling `cancelBooking()` from the existing liteapi lib helper. On success, marks the booking `cancelled` + `paymentStatus='refunded'` with a dated note; on supplier refusal, returns polite error and leaves our store untouched (supplier is truth). Server-side `serialise()` in `app/account/bookings/page.tsx` now computes `canCancel` + formatted `cancellationDeadlineFormatted`. `BookingsTabs.tsx` renders a "Free cancellation until {date}" green chip plus a 2-step "Request cancellation → Confirm cancellation" button pair (armed-then-confirm, no modal). Non-eligible bookings (DOTW, past-deadline, non-refundable) keep the existing "Need changes? → Contact support" link. Bottom disclaimer updated.

**Out of scope (deliberate):** Stripe refund kick-off — still handled by admin/webhook path per BACKLOG note. LiteAPI webhook reconciliation keeps the store honest on races.

**Verification:** `tsc --noEmit` clean · `next build` clean (after `.next` wipe for the usual EPERM).

### V3 — Hotels search quality-of-life — 2026-04-21
Saved plan: `PREMIUM_PLAN_V3.md`.

1. **Nearest-airport distance fix** (Gatwick vs Heathrow bug). `AIRPORT_GROUPS` replaces the 1-per-city list with multi-airport metros (London → LHR/LGW/STN/LTN/LCY, Paris → CDG/ORY/BVA, NYC → JFK/LGA/EWR, plus Milan, Rome, Tokyo, Moscow, Washington, SF, Miami, Chicago, Shanghai, Beijing, Seoul, Bangkok, Dubai, Istanbul, Stockholm, Warsaw, and airport-adjacent towns like Crawley/Hounslow/Horley/Staines). Each card Haversine-picks its own nearest. Verified: 10 London hotels now show 9× LCY + 1× LHR labels, not all LHR.
2. **Neighbourhoods in autocomplete.** LiteAPI `/data/places` now queries `locality,neighborhood,sublocality,airport,hotel`. New `src/lib/neighbourhoods.ts` with curated London (18), Manchester, Edinburgh, Birmingham, Glasgow, Paris, Barcelona, Rome, Dublin. Places API merges LiteAPI first, curated fills gaps. Dropdown shows "Area" chip with `fa-map-pin`. Verified: Paddington → London Paddington top hit; London search surfaces Westminster as curated.
3. **Geolocation on load.** New `/api/hotels/reverse-geocode` (OSM Nominatim). Session-gated effect in `HotelsContent`: asks permission once per session, reverse-geocodes to city, prefills dest + dates (2 weeks out, 2 nights), auto-search fires. Gatwick coords → "Crawley, United Kingdom".
4. **Split-view map + list.** `HotelMap` extended with `activeHotelId`, `onPinHover`, `onPinClick`, `FitBounds`, `PanToActive`, custom height. Desktop: 2-col grid `minmax(0,1fr)_460px` with sticky map. Mobile/tablet: full-width map as before. Hovering a card highlights pin; clicking a pin scrolls the card into view. Verified in preview — split renders, map 750px sticky.

**Files touched:** `hotels-client.tsx`, `HotelMap.tsx`, `liteapi.ts`, new `neighbourhoods.ts`, `places/route.ts`, new `reverse-geocode/route.ts`.
**Verification:** `tsc --noEmit` clean · `next build` clean · live preview smoke-tested.

### V2 — My Account + hotel detail polish — 2026-04-21
Saved plan: `PREMIUM_PLAN_V2.md`.

1. Fixed LiteAPI check-in/out parser (`checkin_start` not `checkin`); Novotel now shows 3 PM correctly. KV `hotel-details:v3`.
2. Per-rate cancellation deadline chip ("Free cancellation until {date}") plumbed through `/api/hotels/rates` (`v2` cache).
3. Per-rate "Pay at the property" chip from LiteAPI `paymentTypes`.
4. Richer Policies section with icon cards (internet, parking, pets, children, groups) on the hotel detail page.
5. My Account area: `/account` sign-in (magic-link, HMAC-SHA256, 1-hour TTL), `/account/bookings` (read-only, tabbed Upcoming/Past/Cancelled), Header desktop + mobile nav links. `SESSION_SECRET` env var needs setting in Vercel prod.

---

## PENDING DEPLOY

Per user's cost policy (one push/day), V2 + V3 + V4 + V5 all sit on this branch until the daily deploy window. Nothing pushed yet.

- [x] `tsc --noEmit` clean (V5)
- [x] `next build` clean (V4 — V5 is UI-only, no build-surface change)
- [ ] Preview smoke-test V4 (Reviews tab on a known-reviewed hotel; cancel flow end-to-end on a refundable LiteAPI booking)
- [ ] Preview smoke-test V5 (Reviews header + footer count on known-reviewed hotel; "Back to search" pill returns with results pre-loaded)
- [ ] Commit
- [ ] Push (bundled V2 + V3 + V4 + V5)
