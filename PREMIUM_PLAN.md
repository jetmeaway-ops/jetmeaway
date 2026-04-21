# JetMeAway — Premium Hotel Detail Page Plan

> Goal: `/hotels/[id]` should feel and act like a premium booking surface — matching or surpassing Booking.com's information density, while keeping Scout's editorial voice. No supplier trust (RateHawk, LiteAPI) is compromised; we just surface what's already in the API response.

## What's already done (Phase 0 — SHIPPED)

- `src/lib/liteapi.ts` — per-rate `taxesAndFees[]` where `included: false` now propagates via `OptionRow.excludedTaxes` → `HotelOffer.boardOptions[].excludedTaxes`.
- `src/app/api/hotels/rates/route.ts` — `BoardOptionOut.excludedTaxes` added and passed through (multi-board + synthesised single-rate path).
- `src/app/hotels/[id]/RoomsTable.tsx` — `RoomRate.excludedTaxes`; price block now reads `£X / night · incl. VAT` and, when present, shows `+ £Y city tax payable at the property`.

Result: BB vs RO comparison is honest again — the customer sees the full grand total (supplier rate + property-payable tax) instead of a misleadingly tight supplier-net delta.

---

## What's missing (from the user's explicit brief)

1. **Per-room detail** — Booking.com shows room size (`m²`), bed config (`1 queen bed`), maximum occupancy, and a checklist of in-room amenities (hairdryer, minibar, kettle, safe, air-con). JetMeAway shows none of this per row.
2. **Room photos** — clicking a room opens a modal with 3-5 photos of that specific room category.
3. **Premium page chrome** — breadcrumb, anchor sub-nav (`Overview · Rooms · Facilities · Reviews · Map`), review tile next to the title, trust chips, "includes all taxes" everywhere.
4. **Information density** — current left column is photo-then-empty-until-rates. Booking.com packs highlights + amenity chips + review summary into the first 600px.
5. **Sticky sidebar health** — sidebar exists but doesn't refresh with the selected row's excludedTaxes or city tax.

---

## The plan — 6 phases, shipped one at a time

### Phase 1 — Extract room-level metadata from LiteAPI
**Files**: `src/lib/liteapi.ts`

LiteAPI `/data/hotel?hotelId=X` already returns a `rooms` array with:
```
rooms: [{
  id, roomName, description,
  roomAmenities: [{ name }],
  photos: [{ url, caption }],
  maxAdults, maxChildren, maxOccupancy,
  roomSizeSquare, roomSizeUnit,    // e.g. 25, "sqm"
  bedTypes: [{ name, quantity }],  // e.g. "Queen Bed" × 1
}]
```

Extend `HotelDetails` interface with:
```ts
rooms: Array<{
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  maxOccupancy: number | null;
  sizeSqm: number | null;
  beds: string | null;          // "1 Queen Bed" formatted
}>;
```

Add a parser function that handles the various shapes LiteAPI returns. Dedupe by `roomName` (case-insensitive).

### Phase 2 — Thread rooms through the details API
**Files**: `src/app/api/hotels/details/[id]/route.ts`, `src/app/hotels/[id]/page.tsx`

- Details route just forwards `getHotelDetails(id)`, so the new `rooms` field comes for free.
- `page.tsx` — extend the `HotelDetails` interface in the page to include `rooms: RoomMeta[]`.
- Add a memoised `roomMetaByName` map (keyed by lowercased room name) so `RoomsTable` rows can resolve metadata cheaply.

### Phase 3 — `RoomDetailModal.tsx` (new component)
**Files**: `src/app/hotels/[id]/RoomDetailModal.tsx` (NEW)

Scout-voiced modal:
- Photo carousel (CSS scroll-snap, same pattern as the hotel gallery)
- Title (Playfair) + size chip + bed chip + max-occupancy chip
- Two-column amenity grid with small emerald/slate dots (reuse ChoiceDot style)
- Description paragraph
- Primary CTA "Secure this rate →" in the sticky footer (reuses `onReserve`)

Close on overlay click, Escape key, and explicit close button. Trap focus with a minimal focus-ring guard.

### Phase 4 — Enrich each RoomsTable row
**Files**: `src/app/hotels/[id]/RoomsTable.tsx`

Per row:
- Left column: room thumbnail (80×60, rounded-xl) to the left of the title when available.
- Under the title: size + bed + occupancy chips (quiet, small-caps).
- "See room details & photos →" link under the chips — opens `RoomDetailModal`.
- Middle column: keep "Scout Choices" (board + cancellation + Wi-Fi) but add top-3 in-room amenity dots (Hairdryer / Minibar / Air conditioning / etc.), picked deterministically from the room metadata.
- Right column: price block (already honest post-Phase-0).

Pass `roomMeta` down as a prop map — `RoomsTable` stays dumb, page owns the data.

### Phase 5 — Premium page chrome
**Files**: `src/app/hotels/[id]/page.tsx`

- Breadcrumb: `Home / Hotels / {city} / {hotel name}` above the title.
- Title row: title + stars, then a review-score pseudo-tile (`8.6 · Excellent · 1,240 reviews` — placeholder until we wire live review data; we at least carry the structure).
- Anchor sub-nav below gallery: smooth-scroll chips for `Overview`, `Rooms`, `Facilities`, `Reviews`, `Location`.
- Highlights strip above the description: free Wi-Fi / Breakfast / Free cancellation / {city} landmark distance — 4 tiles.
- Convert the Amenities section from a dense list to a 3-column chip grid with icon + label (booking.com "Most popular facilities").
- Sidebar: on selected-row change, reflect `selectedRate.excludedTaxes` inline (`+ £Y city tax at the property`) so the reserve total is honest.
- Sticky footer CTA on mobile (< 768px): price + Reserve button pinned to the viewport bottom.

### Phase 6 — Build, typecheck, manual spot-check
- `npx tsc --noEmit` clean
- `npm run build` clean (or `next build`)
- If anything looks off, spin up Chrome extension and verify `/hotels/{id}?...` renders the new rows with size/bed/amenity chips and modal works.

---

## Out of scope for this session (notes for later)
- Live review data (TrustYou / Booking.com review API) — currently we show "No reviews yet" placeholder for Phase 5.
- Photo-by-room on suppliers that don't populate `rooms[].photos` — graceful fallback to hotel-level photos.
- Mobile parity — Phase 5 sticky footer covers the worst gap; further mobile polish (photo zoom, swipe gallery) is a follow-up.
- RateHawk-style "Property Highlights" editorial blurbs — we don't have the data source yet.

## Rollout order
1. Phase 1 — liteapi.ts rooms parser  ✅ SHIPPED
2. Phase 2 — types + prop drilling  ✅ SHIPPED (KV cache bumped to v2)
3. Phase 3 — RoomDetailModal component  ✅ SHIPPED (`src/app/hotels/[id]/RoomDetailModal.tsx`)
4. Phase 4 — RoomsTable rich rows  ✅ SHIPPED (thumbnail, size/bed/occupancy pills, top-3 in-room amenities, "See details" link)
5. Phase 5 — page chrome  ✅ SHIPPED (breadcrumb, anchor sub-nav, trust chips, icon-led amenity grid, mobile sticky footer CTA)
6. Phase 6 — build + spot-check  ✅ SHIPPED (`next build` clean)

Each phase left `tsc --noEmit` clean before the next started.

## Shipped files
- `src/lib/liteapi.ts` — `RoomMeta` type; `HotelDetails.rooms[]`; per-rate `excludedTaxes` in boardOptions.
- `src/app/api/hotels/rates/route.ts` — `BoardOptionOut.excludedTaxes` threaded through both code paths.
- `src/app/api/hotels/details/[id]/route.ts` — KV key bumped to `v2` so cached entries re-fetch with the new rooms[] shape.
- `src/app/hotels/[id]/RoomsTable.tsx` — per-row thumbnail, spec pills, in-room amenity highlights, "See room details & photos" link, honest VAT + city-tax labelling.
- `src/app/hotels/[id]/RoomDetailModal.tsx` — NEW. Photo carousel, spec chips, amenity grid, sticky footer CTA.
- `src/app/hotels/[id]/page.tsx` — breadcrumb, trust chips, anchor sub-nav (sticky), icon-led facilities grid, memoised `roomMetaByName` map, modal render, mobile sticky bottom CTA.

## Follow-ups (deliberate non-goals this session)
- Live review score — we shipped the trust-chip row instead of a fake score. Real review data from TrustYou / Booking.com review API is a next-session task.
- Property highlights editorial blurbs — need a new data source.
- Photo zoom / pinch — the modal supports prev/next + thumbnails but not pinch zoom yet.
- Review-score tile next to the title — kept the structural space (trust chips) but didn't invent a fake score.

