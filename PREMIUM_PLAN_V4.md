# PREMIUM_PLAN_V4 — Backlog drain (B1 + B2 + B3)

**Date shipped:** 2026-04-21
**Follows:** PREMIUM_PLAN_V3.md (hotels search quality-of-life)
**Driver:** user message 2026-04-21 — "save everything then give me a short summary"; "start to do what is left"
**Rule set this session:** (a) save every new item to BACKLOG.md first, don't context-switch; (b) save every piece of work to a plan file **before** showing preview; (c) one push per day.

---

## What shipped

| Item | Title | File(s) touched |
|---|---|---|
| **B1** | Date-strip fill-or-kill | `src/app/hotels/hotels-client.tsx` |
| **B2** | Reviews tab on `/hotels/[id]` | `src/lib/liteapi.ts`, `src/app/api/hotels/details/[id]/route.ts`, `src/app/hotels/[id]/page.tsx` |
| **B3** | My Trips — self-service cancellation | `src/lib/bookings.ts`, `src/app/api/hotels/book/route.ts`, `src/app/api/account/bookings/cancel/route.ts` (NEW), `src/app/account/bookings/page.tsx`, `src/app/account/bookings/BookingsTabs.tsx` |

Verification: `tsc --noEmit` clean, `next build` clean (after the Windows OneDrive `.next` EPERM wipe). Preview server restarted fresh on port 3000.

---

## B1 — Date-strip fill-or-kill

### Why
User screenshot 2026-04-21 showed a `DateMatrixStrip` where only one of seven date cells had a price; the other six rendered as `—`. User rule: "If it's not filling up all seven days, this looks bad. If he's empty without price." BACKLOG ship criterion: **≥6 of 7 cells filled, or remove the strip entirely.**

### Root cause
`DateMatrixStrip` is backed by Hotellook's `cache.json` via `/api/hotels?mode=datestrip` — a free, KV-cached endpoint. Coverage is uneven: popular central-London hotels get 6/7 coverage; Canary Wharf / less-travelled neighbourhoods get 1/7.

### Fix
**Dynamic coverage gate.** Replace the old render condition:

```tsx
{(dateStripLoading || dateStrip.length > 0) && (
  <DateMatrixStrip ... />
)}
```

…with an IIFE that:
1. Renders the loading skeleton while `dateStripLoading` is true.
2. After load, counts `dateStrip.filter(c => c.price !== null).length`.
3. Only renders the component when the filled count is ≥6.
4. Otherwise returns `null` — silently disappears.

No new API calls; no extra KV reads. Purely a UI coverage gate.

### Trade-offs considered (and rejected)
- **Widen D±3 → D±6.** Doesn't fix sparseness — just moves the holes.
- **7 LiteAPI per-day availability calls.** Rejected in BACKLOG: prohibitive cost per page-view.
- **Derive per-day estimates from the current LiteAPI result (total / nights × DoW coefficient).** BACKLOG-noted as "cheap but inaccurate"; user wants real prices or no prices.
- **Alternative cache endpoint.** Needs research; parked.

Net result: strip shows when Hotellook has the data, disappears cleanly when it doesn't. No half-filled grid ever reaches production.

---

## B2 — Reviews tab on hotel detail page

### Why
User on 2026-04-21: "I still cannot see the review Section next to Rooms & rates Overview Facilities Policies, reviews." LiteAPI exposes review data via `/data/reviews` which we weren't calling.

### Design
1. **Parallel fetch** in `getHotelDetails()` — one extra call per cache-miss, `Promise.all`-sequenced with the existing `/data/hotel` call so we don't serialise the latency.
2. **Single KV entry** — reviews piggyback on `hotel-details:v4:{hotelId}` (24h TTL), so subsequent visitors don't re-fetch.
3. **Never hide the tab** — ship rule was explicit. When LiteAPI returns zero reviews we render a "No reviews yet" empty state.

### Library additions — `src/lib/liteapi.ts`

New types:
```ts
export interface HotelReview {
  name: string;
  country: string | null;
  type: string | null;      // trip type: Business, Solo, Family, ...
  date: string | null;      // ISO
  language: string | null;  // lowercased ISO-639 (en, fr, es, ...)
  headline: string | null;
  pros: string | null;
  cons: string | null;
  score: number | null;     // 0-10 per-review
}
export interface HotelReviews {
  averageScore: number | null;  // rounded to 1dp
  count: number;                // from `total` if provided, else list length
  list: HotelReview[];
}
```

`HotelDetails` extended with `reviews: HotelReviews`.

New function `getHotelReviews(hotelId, limit=8)`:
- Hits `/data/reviews?hotelId=X&limit=N&timeout=5` with 8s client-side timeout
- Defensive against two response shapes: `{ data: [...] }` and `{ reviews: [...] }`
- HTML-strips every text field (pros, cons, headline) via `replace(/<[^>]*>/g, ' ')`
- Falls back to mean of per-review scores when top-level `averageScore` absent
- On any error returns `{ averageScore: null, count: 0, list: [] }` — non-fatal

In `getHotelDetails`:
```ts
const [res, reviews] = await Promise.all([
  liteFetch<{ data: RawHotel }>(`/data/hotel?hotelId=${id}`, ..., 12_000),
  getHotelReviews(hotelId, 8),
]);
```

### Cache bump
`src/app/api/hotels/details/[id]/route.ts`: KV key `hotel-details:v3:{id}` → `hotel-details:v4:{id}`. Previous v3 entries are missing the `reviews` object.

### UI — `src/app/hotels/[id]/page.tsx`

Local types mirror the lib shape (`HotelReview`, `HotelReviews`); `HotelDetails.reviews` is optional on the local type since very old cached entries (rare, 24h TTL) might not carry it.

**Sub-nav:** added a new `<li><a href="#reviews">Reviews</a></li>` between Facilities and Location. **Always visible** — even zero-review hotels get the link per ship rule.

**Section:** new `<section id="reviews">` between Facilities and Location.
- **Header row:** title + description on left; score tile on right (emerald background, big score, "out of 10" label) + verbal label (Superb ≥9, Very good ≥8, Good ≥7, Pleasant ≥6, Mixed ≥4, Limited feedback <4) + "Based on {count} reviews".
- **Body:** 2-column grid on desktop, 1-col on mobile, up to 5 reviews. Each card: name, country·type·date line, language badge (lowercased), per-review score chip (green), optional headline in quotes, pros row (thumbs-up green), cons row (thumbs-down champagne).
- **Empty state:** slate card, comment-dots icon, "No reviews yet — once guests complete their stay, their feedback will appear here."

Helpers added to the page:
- `scoreLabel(n: number): string` — Booking.com-style verbal labels.
- `formatReviewDate(iso: string): string` — "2025-11-03" → "Nov 2025".

---

## B3 — My Trips self-service cancellation

### Why
V2 shipped the read-only booking list. User expected "Need changes?" to actually do something. BACKLOG constraint: LiteAPI only (DOTW doesn't expose cancel via API); gate on refundable-within-deadline. Out of scope: Stripe refund side (webhook / admin path already handles it).

### Data layer — `src/lib/bookings.ts`

`Booking` type extended with:
```ts
cancellationDeadline?: string | null;
```

Null/absent means non-refundable rate or supplier didn't surface one.

### Book-side plumbing — `src/app/api/hotels/book/route.ts`

`mirrorToUnified()` now copies `record.cancellationDeadline` (already present on `PendingBooking`) into the new `Booking.cancellationDeadline` field. Every LiteAPI hotel booking written to the unified store from today forward carries its deadline. Older bookings (nil deadline) simply won't show the self-cancel button.

### API — NEW `src/app/api/account/bookings/cancel/route.ts`

POST with `{ bookingId }`. Node runtime, 30s maxDuration.

**Gates (order matters):**
1. **Session exists** → 401 if not.
2. **`bookingId` in body** → 400 if missing.
3. **Booking exists in KV** → 404 if not.
4. **Ownership:** `booking.customerEmail.toLowerCase() === session.email` → 404 on mismatch (not 403, to avoid confirming the booking exists under another email — enumeration defence).
5. **Status is amendable:** reject if already `cancelled`/`refunded`/`failed` (409) or `completed` (409 with "contact support for post-stay issues").
6. **Supplier === `liteapi`** → 403 if DOTW or other.
7. **Deadline present + valid + in the future** → 403 with a clear message for each failure mode.

**Happy path:**
- Call existing `cancelBooking(supplierRef || id)` from `lib/liteapi.ts` (uses `PUT /bookings/{id}`).
- On supplier refusal → return polite 502, **do not mutate our store** (supplier is truth about cancellation).
- On success → `upsertBooking({ ...booking, status: 'cancelled', paymentStatus: 'refunded', updatedAt: now, notes: appended with "[YYYY-MM-DD] Customer self-cancelled ... — refund £N" })`.
- Response: `{ success: true, status, refundAmount }`.

### Server-rendered eligibility — `src/app/account/bookings/page.tsx`

The `serialise()` helper now computes `canCancel` server-side using the **same rule** as the API route (single source of truth — page and API agree on eligibility without the client knowing the logic). Also formats `cancellationDeadlineFormatted` as "DD Mon YYYY".

### UI — `src/app/account/bookings/BookingsTabs.tsx`

`BookingCard` state: `armed` (bool), `cancelError` (string | null), `pending` (useTransition).

**Two-step confirm — no modal:**
1. Click "Request cancellation" (red pill) → sets `armed = true`.
2. Now two buttons show side-by-side: "Keep booking" (grey) and "Confirm cancellation" (red solid).
3. Confirm click → POST `/api/account/bookings/cancel` → on success `window.location.assign('/account/bookings?tab=cancelled')` so the booking hops into the Cancelled tab with fresh server state.
4. On error → inline red banner with the server's message, card resets to unarmed.

**Indicator chips:**
- Eligible bookings show a green "Free cancellation until {date}" chip.
- API error (if cancel fails) renders as a red "triangle-exclamation" banner above the footer.

**Non-eligible bookings:** unchanged — the existing "Need changes? → Contact support" link stays.

### Page footer copy

Changed from "…self-service cancellation is coming next" to "Refundable bookings can be cancelled straight from the card above, up to the free-cancel deadline on your rate. For everything else, please contact support." — reflects the shipped state.

---

## Files touched (single view)

```
src/app/hotels/hotels-client.tsx                                   [B1]
src/lib/liteapi.ts                                                 [B2]
src/app/api/hotels/details/[id]/route.ts                           [B2]
src/app/hotels/[id]/page.tsx                                       [B2]
src/lib/bookings.ts                                                [B3]
src/app/api/hotels/book/route.ts                                   [B3]
src/app/api/account/bookings/cancel/route.ts          (NEW)        [B3]
src/app/account/bookings/page.tsx                                  [B3]
src/app/account/bookings/BookingsTabs.tsx                          [B3]
```

Plus:
```
BACKLOG.md                                   (DONE entry for V4 added)
PREMIUM_PLAN_V4.md                           (this file)
```

---

## Out of scope (intentional — deferred)

- **Stripe refund initiation from cancel route.** Existing LiteAPI webhook + admin flow already handles refund accounting. Rolling it into the customer-facing cancel route would add latency and tightly couple two failure modes (supplier rejects → Stripe still refunded).
- **Amendment** (change dates / guest count / room type). LiteAPI doesn't expose a clean amend API; practical amend means cancel-and-rebook at a new rate. Keep that path through support for now until we see demand.
- **DOTW self-cancel.** DOTW doesn't expose it via API. Those bookings keep the "Contact support" link.
- **Reviews pagination.** We cap at 5 visible reviews × 8 fetched. More than enough for trust signal; any deeper read would need its own UX and an on-demand lazy-load endpoint.
- **Reviews filter by language.** Language badge is shown but not filterable. Low-value add until we see a multi-lingual user base.

---

## Verification log

```
npx tsc --noEmit          → clean (no output)
rm -rf .next && next build → clean (all routes compiled, no errors)
Dev server restarted       → http://localhost:3000 Ready in 1089ms
Screenshot                 → /hotels renders, "My Trips" in header, search form intact
```

Smoke-test checklist for preview (user-driven):
- [ ] `/hotels/[id]` on a known-reviewed property → Reviews section shows score + list
- [ ] `/hotels/[id]` on an obscure property → Reviews section shows "No reviews yet" (not hidden)
- [ ] `/hotels` search on a well-covered city (London/Manchester) → date strip visible
- [ ] `/hotels` search on a sparse query → date strip absent (not half-filled)
- [ ] `/account/bookings` on a refundable LiteAPI booking → green deadline chip + red cancel button
- [ ] Click Cancel → Confirm → booking moves to Cancelled tab, supplier gets the PUT
- [ ] Past-deadline booking → no cancel button, "Need changes? → Contact support" link instead

---

## Post-ship tweaks

### 2026-04-21 — Reviews section moved to the end of `/hotels/[id]`
User request: "Can you please put the reviews in the end? After policy?"

**Before:** order was Rooms → Overview → Location → Facilities → **Reviews** → Policies.
**After:** order is now Rooms → Overview → Location → Facilities → Policies → **Reviews**.

Why it's better: the detail page now ends on social proof (guest scores, pros/cons) rather than legal copy (check-in times, house rules). Policies is reference material users dip into; reviews are what tips a booking decision — better last.

**Files:** `src/app/hotels/[id]/page.tsx` only.
- Anchor sub-nav: moved the Reviews `<li>` to last so nav order matches DOM order.
- Section: cut the whole `<section id="reviews">` block from between Facilities and Policies; pasted it after the Policies section closes, just before the left-column wrapper `</div>`.
- Comment updated to note the reorder and the rationale.

Verification: `tsc --noEmit` clean. Dev server already running; hot-reloaded.

### 2026-04-21 — Booking.com-style review-count prominence
User request: "If you can please add the numbers of the reviews actually in the reviews area. For reference, please look at Booking.com — they show reviews, and underneath the reviews, they show how many reviews that place already have."

**Two changes to the `<section id="reviews">` block on `/hotels/[id]`:**

1. **Header count promoted.** The old line "Based on {n} reviews" in muted grey (.75rem, #5C6378 semibold) was demoted copy. Replaced with:
   - Verbal label (Superb / Very good / …) at `.92rem` black.
   - Count itself as a second line at `.82rem` **black #0a1628** — "{count} reviews" reads as a first-class number, not a caption.
   - "Verified guests" micro-label underneath in uppercase tracked text.
2. **Footer count beneath the cards.** Added a bordered footer strip after the `<ul>` closes (only when `reviews.count > 0`):
   - Left: "Showing {visible} of **{total}** verified guest reviews" — the total bold.
   - Right: `fa-shield-check` + "{label} · {score}/10 average" as a final social-proof stamp.
   This mirrors Booking.com's pattern of re-stating the full review corpus size directly beneath the visible review list so users know there's more depth than the 5 we show.

**Files:** `src/app/hotels/[id]/page.tsx` only. Wrapped `<ul>` in a fragment `<>…</>` to add the sibling footer without breaking the ternary.

Verification: `tsc --noEmit` clean.

---

## Deploy status

All three items + V2 + V3 are queued on the working branch. Per the one-push-per-day rule they ship together at the next deploy window. No push yet.
