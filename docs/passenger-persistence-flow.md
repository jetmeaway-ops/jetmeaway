# Passenger / Occupancy Persistence — Audit (2026-04-30)

Single source of truth for how `adults`, `children`, `childAges`, and `rooms`
flow from the home-page wizard to the supplier and back. Built as part of
Stage 5 of the Safety Net build to prevent another regression like
[ca7e173](../) (per-card subtitle was showing "2 guests" when the search ran
with kids correctly — i.e. metadata was *visually* dropped on render only).

## Touchpoint map

| #  | Layer                                   | File                                                          | Carries                                            |
|----|-----------------------------------------|---------------------------------------------------------------|----------------------------------------------------|
| 1  | Home wizard / hotel search form         | `src/app/page.tsx`, `src/app/hotels/hotels-client.tsx`        | adults, children, childrenAges[], rooms            |
| 2  | URL search params                       | `/hotels?city=…&adults=…&children=…&childrenAges=…&rooms=…`   | string-encoded                                     |
| 3  | API edge — search                       | `src/app/api/hotels/route.ts` GET                             | parsed via `HotelSearchSchema` (Zod, this build)   |
| 4  | LiteAPI `/hotels/rates` request         | `src/lib/liteapi.ts` `searchRates`                            | `occupancies[].adults` + `children[]` (ages)       |
| 5  | Results render                          | `src/app/hotels/hotels-client.tsx` card subtitle              | per-card `'X adults · Y children'` line            |
| 6  | Hotel detail / rates fetch              | `src/app/api/hotels/rates/route.ts`, `[id]/RoomsTable.tsx`    | re-passes the same query string                    |
| 7  | Start-booking (offer-select)            | `src/app/api/hotels/start-booking/route.ts` POST              | persists `PendingBooking` to KV `pending-booking:*`|
| 8  | KV — `pending-booking:<ref>`            | shape: `PendingBooking` (start-booking/route.ts:27)           | adults, children, childAges[], rooms               |
| 9  | Checkout page                           | `src/app/hotels/checkout/[ref]/page.tsx`                      | reads `PendingBooking`, renders summary            |
| 10 | Prebook                                 | `src/app/api/hotels/prebook/route.ts` POST                    | sends `offerId` only — occupancy pinned by offer   |
| 11 | LiteAPI Payment SDK form                | client-side, talks direct to LiteAPI                          | shows current price/dates to customer              |
| 12 | Book                                    | `src/app/api/hotels/book/route.ts` POST                       | sends `prebookId` + `transactionId` only           |
| 13 | Bookings store (admin)                  | `src/lib/bookings.ts` upsert via `mirrorToUnified`            | derived: `guests = adults + (children ?? 0)`       |

## Where occupancy could silently drop

| Risk                                                                  | Caught by                                                                        |
|-----------------------------------------------------------------------|----------------------------------------------------------------------------------|
| Wizard hands wrong shape to URL                                       | Monkey test (`scripts/monkey-search.mjs`) — randomises children + asserts echo   |
| URL → API: parse fails or coerces to 0                                | `HotelSearchSchema.safeParse` rejects with 400                                   |
| API → LiteAPI: occupancy array built wrong                            | `searchRates` requires `occupancy.length >= 1`; reviewed manually 2026-04-30     |
| Result render: per-card subtitle ignores `children`                   | Fixed in `ca7e173`; covered by manual spot-check on prod                         |
| KV record drift between start-booking and prebook                     | `verifyOccupancyShape(record)` in prebook + book (`src/lib/booking-boundary.ts`) |
| LiteAPI returns different dates/price than we quoted                  | `verifyBookingBoundary` — soft alert at prebook, soft alert at book              |
| Admin store guest count miscount                                      | `mirrorToUnified` derives `guests = adults + (children ?? 0)` — verified above   |

## Verification — guest-display logic (post-`ca7e173`)

The card subtitle now reads from the search-context `children` value rather
than re-deriving from a hotel-level field. Spot-checked at:

- Search list cards — `hotels-client.tsx`
- Hotel detail header — `[id]/page.tsx`
- Checkout summary — `checkout/[ref]/page.tsx`

All three pull from the same source: the URL search params (cards/detail) or
the `PendingBooking` record (checkout). With Zod validation in front and the
boundary helpers behind, any mutation between these two points triggers a
409 + bug-inbox entry instead of a silent display bug.

## What this audit deliberately does not cover

- Flight-side passenger flow (Duffel) — separate audit, separate file later.
- Cars / packages / esim — affiliate redirects, no on-site passenger state.
- Car-rental driver age — handled in deep-link builder, not persisted.

## Owning regressions

If a passenger field starts dropping again:

1. `node scripts/monkey-search.mjs` — confirm the regression reproduces.
2. `curl -H "Authorization: Bearer $ADMIN_SECRET" https://jetmeaway.co.uk/api/admin/bugs?status=open`
   — see if the boundary helpers caught it on the booking path.
3. Walk the touchpoint map above in order; the first row where the value is
   wrong is the layer that broke.
