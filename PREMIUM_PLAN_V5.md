# PREMIUM_PLAN_V5 — Hotel detail: Reviews-count prominence + Back-to-search button

**Date shipped:** 2026-04-21
**Follows:** PREMIUM_PLAN_V4.md (backlog drain — date-strip gate, Reviews tab, self-service cancel)
**Driver:** two user messages, 2026-04-21
  1. "If you can please add the numbers of the reviews actually in the reviews area. For reference, please look at Booking.com — they show reviews, and underneath the reviews, they show how many reviews that place already have."
  2. "There is no button to go back to search once you open a hotel. You should have a go-back button to the search again. When you press back here, it go back to the main empty search page."

**Rules this session:** (a) every new backlog item → BACKLOG.md first; (b) save to plan file BEFORE showing preview; (c) one push per day.

---

## What shipped

| Item | Title | File(s) touched |
|---|---|---|
| **V5-1** | Reviews-count prominence (Booking.com-style) | `src/app/hotels/[id]/page.tsx` |
| **V5-2** | "Back to search results" button on hotel detail | `src/app/hotels/[id]/page.tsx` |

Verification: `tsc --noEmit` clean. No API-surface changes, no KV key bumps.

---

## V5-1 — Reviews-count prominence (Booking.com-style)

### Why
V4 shipped a Reviews section with a small emerald score tile and a muted caption "Based on {n} reviews". Customer feedback: the count wasn't prominent enough. Booking.com uses a two-place pattern — a bold review count beside the score tile at the top, AND a footer line beneath the visible reviews ("Showing X of Y reviews"). The second line is doing real work: it tells users the corpus behind the score is deep even though we only render 5 cards.

### Fix
Two changes, both in the `<section id="reviews">` block of `src/app/hotels/[id]/page.tsx`.

**1. Header count promoted.** Replaced the muted caption with a three-line stack next to the score tile:

```tsx
<div className="text-[.75rem]">
  <div className="font-poppins font-black text-[.92rem] text-[#0a1628] leading-tight">
    {scoreLabel(hotel.reviews.averageScore)}
  </div>
  <div className="text-[#0a1628] font-black text-[.82rem] leading-tight mt-0.5">
    {hotel.reviews.count.toLocaleString()} review{hotel.reviews.count === 1 ? '' : 's'}
  </div>
  <div className="text-[#8E95A9] font-semibold text-[.66rem] uppercase tracking-[.8px]">
    Verified guests
  </div>
</div>
```

Ratings typography ladder is now: verbal label (Superb / Very good …) → numeric count → micro-label. The count reads as a first-class number, not a caption.

**2. Footer count beneath the cards.** Wrapped the `<ul>` in a fragment `<>…</>` and added a bordered footer strip right after it, only when `reviews.count > 0`:

```tsx
<div className="mt-5 pt-4 border-t border-[#E8ECF4] flex flex-wrap items-center justify-between gap-3">
  <p className="text-[.82rem] text-[#0a1628] font-poppins font-bold">
    Showing {Math.min(5, hotel.reviews.list.length)} of{' '}
    <span className="font-black">{hotel.reviews.count.toLocaleString()}</span>{' '}
    verified guest review{hotel.reviews.count === 1 ? '' : 's'}
  </p>
  {typeof hotel.reviews.averageScore === 'number' && (
    <p className="text-[.72rem] text-[#5C6378] font-semibold">
      <i className="fa-solid fa-shield-check text-emerald-600 mr-1.5" />
      {scoreLabel(hotel.reviews.averageScore)} · {hotel.reviews.averageScore.toFixed(1)}/10 average
    </p>
  )}
</div>
```

The empty-state branch (no reviews yet) is unchanged — we don't fake a count there.

### Trade-offs considered
- **Add a "Show all N reviews" button that opens a modal with the full list.** Rejected for V5 — LiteAPI `/data/reviews?limit=100+` isn't KV-cached and would double the cost per hotel open. Queue for V6 if users ask.
- **Use stars instead of /10.** LiteAPI returns scores 0–10 natively; converting is lossy. Booking.com also uses /10 so the visual language matches.

---

## V5-2 — "Back to search results" button on hotel detail

### Why
Customer-reported: on `/hotels/[id]`, there is no visible way back to the results grid. Browser back does navigate to `/hotels`, but the landing page is fully client-driven — it reads URL params on mount, otherwise sits empty — so from a history-less back navigation the user lands on a blank search form. Result: they have to retype destination + dates just to see the sibling hotels they were just comparing. That's a brutal UX drop-off at the exact moment they're still shopping.

### Root cause
`src/app/hotels/hotels-client.tsx:1599` reads URL params on mount, and `autoSearched` ref (line 1831) auto-fires `handleSearch()` as soon as destination + both dates are set. So:
- `/hotels?destination=London&checkin=2026-05-12&checkout=2026-05-14&adults=2&rooms=1` → hydrates → auto-searches → shows results.
- `/hotels` (plain) → empty state, triggers geolocation fallback.
- Browser back after the hotel-detail `<Link>` navigation → ends up at `/hotels` plain (no params), hence the empty state.

Fix is NOT to break the auto-search or history — it's to give the user a URL-carrying button so they explicitly route back with all the search context intact.

### Fix
Added a prominent pill button above the breadcrumb on `/hotels/[id]`:

```tsx
<div className="mb-3">
  <a
    href={(() => {
      const qp = new URLSearchParams();
      if (city) qp.set('destination', city);
      if (checkin) qp.set('checkin', checkin);
      if (checkout) qp.set('checkout', checkout);
      if (adults) qp.set('adults', adults);
      if (children && children !== '0') qp.set('children', children);
      if (rooms) qp.set('rooms', rooms);
      const qs = qp.toString();
      return qs ? `/hotels?${qs}` : '/hotels';
    })()}
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#E8ECF4] text-[.78rem] font-poppins font-bold text-[#0a1628] hover:bg-[#FCFAF5] hover:border-[#E8D8A8] shadow-[0_2px_10px_rgba(10,22,40,0.04)] transition-colors"
    aria-label="Back to search results"
  >
    <i className="fa-solid fa-arrow-left text-[.7rem]" />
    Back to search{city ? ` in ${city}` : ' results'}
  </a>
</div>
```

Behaviours:
- `/hotels?…` re-run: because hotels-client hydrates from URL params and `autoSearched` fires once, the user lands with results already rendering — no typing, no clicks.
- Label is contextual: shows "Back to search in London" when we know the city, else "Back to search results".
- Falls back to `/hotels` plain when no search context (e.g. a direct share link).
- The Phase-5 breadcrumb remains as the secondary nav path — two back-affordances is intentional (prominent pill + semantic breadcrumb).

### Why a pill not `router.back()`
`router.back()` uses browser history, which is exactly the broken path the user complained about. An explicit `/hotels?…` URL is deterministic: it works on first load, after a refresh, after opening the detail page in a new tab, and after navigating through multiple hotels in the same session. History-independent is the point.

### Trade-offs considered
- **Mobile-sticky variant.** On mobile, the pill scrolls away with the header. Considered a sticky bottom-bar "back" button; rejected for V5 to keep scope tight — the existing mobile breadcrumb is still reachable by scrolling up, and the header's hamburger provides a secondary nav. Will add a sticky mobile variant if users ask.
- **Storing the full results URL in sessionStorage when navigating to detail.** More accurate (would preserve filters like stars, board, refundable-only). Rejected for V5: more moving parts, and the query-param approach covers the core ask without any new storage layer. Queue if filter preservation becomes a real complaint.
- **`router.back()` with URL fallback.** Too subtle — users can't tell which version they'll get on any given click.

---

## Files touched (both items)

- `src/app/hotels/[id]/page.tsx` — reviews section header typography + footer strip; new back-to-search pill above breadcrumb.

---

## Verification

- `npx tsc --noEmit` → clean.
- No API surface changed, no KV keys bumped (v4 from V4 still valid for details + reviews payload).
- Smoke-test list (still to do on preview):
  - [ ] Open a known-reviewed hotel on `/hotels/[id]` — confirm header shows "{label} / {count} reviews / Verified guests" stack AND footer "Showing 5 of N verified guest reviews".
  - [ ] Open a no-reviews hotel — footer should NOT appear, empty-state card shows instead.
  - [ ] Click "Back to search in {city}" — lands on `/hotels` with results auto-loaded for original destination/dates.
  - [ ] Direct-link to a hotel (no `city` param) — button reads "Back to search results" and navigates to plain `/hotels`.

---

## Post-ship tweaks

### 2026-04-21 — Reviews header stack reordered (user request)
User wanted the total-count line promoted above the verbal label and given more weight — "10,573 reviews, it should be 'Reviews' then right under it total number of reviews."

**Before:** label (Superb) / "10,573 reviews" (.82rem) / "VERIFIED GUESTS" micro.
**After:** label (Superb) / "REVIEWS" micro-label (.66rem uppercase) / **"10,573"** at 1.05rem black — the number is now the largest element in the stack, reads as the headline datum.

Footer strip beneath the review cards is unchanged.

Files: `src/app/hotels/[id]/page.tsx` only. `tsc --noEmit` clean.

### 2026-04-21 — Review count pill added to sub-nav (user request)
User noticed the sub-nav (`Rooms & rates | Overview | Facilities | Policies | Reviews`) had unused horizontal room and asked for the total review count right next to "Reviews". Added a small gold pill (`bg-[#FAF3E6] ring-[#E8D8A8] text-[#8a6d00]`, .66rem black, tabular-nums) that renders the count inline with the anchor link. Only rendered when `hotel.reviews.count > 0` so empty hotels don't show "Reviews 0". Reinforces social proof at the top of the page before the user scrolls.

Files: `src/app/hotels/[id]/page.tsx` only. `tsc --noEmit` clean.

---

## Deploy status

V5 queues on the working branch alongside V2 + V3 + V4. One push per day — all ship in the next deploy window.
