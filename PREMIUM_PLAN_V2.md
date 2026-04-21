# JetMeAway — Premium Hotel Page v2 Plan

> Written 2026‑04‑21, after a full top‑to‑bottom review of `src/app/hotels/[id]/page.tsx` and `RoomsTable.tsx`.
>
> v1 (PREMIUM_PLAN.md) shipped: breadcrumb, trust chips, anchor sub-nav, icon facilities grid, room modal, mobile sticky CTA, honest VAT + city‑tax labelling.
>
> v2 scope: **fix the check‑in/out data bug**, **borrow the best of RateHawk's room card**, **add My Account** (first customer‑facing self‑service area on the site).

---

## 0. Root‑cause diagnosis — check‑in/out bug

LiteAPI's `/data/hotel` returns the times under **different keys** than our parser expects:

```jsonc
// What LiteAPI actually returns:
"checkinCheckoutTimes": {
  "checkin_start":   "03:00 PM",   // ← real check‑in time
  "checkin_end":     "12:00 AM",
  "checkout":        "12:00 PM",
  "instructions":    [],
  "special_instructions": ""
}
```

Our parser (`src/lib/liteapi.ts` lines 776 + 934–935) reads:
- `h.checkinCheckoutTimes.checkin`  ← field does not exist → always `null`
- `h.checkinCheckoutTimes.checkout` ← correct

Effect: every LiteAPI hotel page shows **only checkout**, never check‑in. The stay‑schedule chip in the sidebar and the Policies section both skip the check‑in row silently because `hotel.checkInTime` is `null`.

Bonus find in the same payload: `policies[]` with 5 real paragraphs (internet, parking, groups, pets, children) that we're dropping on the floor today.

---

## 1. Full page audit — what's solid, what's thin

| # | Section | Status | Note |
|---|---------|--------|------|
| 1 | Breadcrumb | ✅ | |
| 2 | Title + stars + address + 3 trust chips | ✅ | |
| 3 | Review score tile | ⚠️ missing | Comment at line 459 says placeholder — still a blank space next to the title |
| 4 | Gallery | ✅ | |
| 5 | Sticky anchor sub‑nav | ✅ | |
| 6 | Rooms table | ✅ | Phase‑4 shipped; RateHawk polish below |
| 7 | About this hotel | ✅ adequate | `slice(0, 1200)` truncation — no "read more" expand |
| 8 | Location map | ✅ | |
| 9 | Facilities icon grid | ✅ | |
| 10 | Policies | ⚠️ thin | Only check‑in/out — ignores 5 rich `policies[]` |
| 11 | Sidebar price + schedule + perks | ✅ | |
| 12 | Sidebar CTA | ✅ | |
| 13 | Similar hotels | ✅ | |
| 14 | Mobile sticky CTA | ✅ | Verified in preview @ 375×812 |

Minor:
- `handleBook` legacy URL path always passes `checkInTime: null` today; self‑heals once parser is fixed.
- Sub‑nav promises a "Reviews" anchor we never built (deferred).

---

## 2. RateHawk‑style room‑card borrowings (trust‑lift, tiny diff)

Ranked by trust impact per line of code:

1. **Explicit cancellation deadline** — "Free cancellation until 28 May 2026, 23:59" beats a generic badge. Source: LiteAPI rate `cancellationPolicies[].deadline`.
2. **"Pay at hotel" chip** when rate allows it. Source: LiteAPI rate `paymentTypes` array contains `PAY_AT_HOTEL`.
3. **Tax/fee breakdown popover** on total click — `Room rate · VAT · City tax (at property) · Total`. Builds trust for the "incl. VAT" claim.
4. **Amenity icon‑only row with hover titles** — frees horizontal space for a longer room name.
5. **Bed illustration SVG** — tiny bed glyph beside "1 King Bed". Reads faster than text alone.
6. **"Only N left at this price" urgency chip** — only when LiteAPI `remaining` is honestly present. Silent otherwise (Scout rule).

Priority pick: **#1 + #2** — biggest credibility lift, minimal UI churn.

---

## 3. My Account — first customer self‑service surface

Today: every booking is guest‑email only. No way to look up a booking, check the voucher, or cancel without emailing waqar@. This bleeds support time and damages trust.

Reference: Booking.com "My Trips" (Upcoming · Past · Cancelled tabs, per‑booking detail, cancel button respecting policy window).

### Proposed structure

```
/account                     overview card (next trip, quick actions)
/account/bookings            tabs: Upcoming · Past · Cancelled
/account/bookings/[ref]      single booking detail
/account/profile             name / email / phone / prefs
```

### Auth
Passwordless email magic‑link. We already use Resend for deal alerts — adds ~30 lines of glue. No password store, no breach surface, no compliance debt. SSO (Google/Apple) is a later‑session item.

### Data source
Unified `bookings` KV store is already populated by `mirrorToUnified()` in the hotel book route (shipped in 1563d81 per MEMORY). Just needs an email‑indexed read.

### Booking detail page content
- Hotel name + hero photo + dates + guest names + room type + board
- Supplier booking ID (LiteAPI ref)
- **Correct** check‑in/out times (relies on #0 fix)
- Hotel address, phone, map
- Cancellation deadline + Cancel button (LiteAPI cancel API, confirm modal)
- Contact the property (tel: + mailto:)
- Download voucher PDF (LiteAPI emits a voucher URL on confirm)

### What LiteAPI's amendment API supports
- ✅ Guest name corrections
- ✅ Add special requests (e.g. "high floor, away from elevator")
- ✅ Cancel (within refund window)
- ❌ Date change → must cancel + rebook (mirror Booking.com — show a "Change dates" button that takes them to rebook with a banner)
- ❌ Room upgrade → same

### Prohibited‑action reminders
- Never auto‑enter credit cards (even saved ones)
- Cancellations require explicit confirm in the chat/modal
- Account creation must be the user's action, never silent

### Build phases
| Phase | Scope | Complexity |
|-------|-------|-----------|
| A | Magic‑link auth + HttpOnly session cookie (Resend) | medium |
| B | `/account/bookings` list from existing KV | small |
| C | `/account/bookings/[ref]` detail page | medium |
| D | Cancel flow (LiteAPI cancel API + confirm modal + KV update) | medium |
| E | Profile edit + LiteAPI name‑correction endpoint | small |
| F | Email notifications (confirmation / reminder / cancellation) | small (Resend) |

Target: A+B in one session → customer can at least **see** their booking. C+D follow. E+F polish.

---

## 4. Execution order (single commit per deploy, per memory rule)

1. **Fix LiteAPI parser** — read `checkin_start` (with `checkin` fallback) and capture `policies[]`. Bump KV key `hotel-details:v2` → `v3` so cached entries refresh.
2. **Surface cancellation deadline per row** — plumb `cancellationPolicies[0].deadline` through `/api/hotels/rates` → `RoomRate.cancelDeadline` → RoomsTable row.
3. **Surface "Pay at hotel" chip** — plumb `paymentTypes` through the same pipe → RoomRate + row.
4. **Richer Policies section** — render the 5 LiteAPI policies as icon cards (reuse `HOTEL_AMENITY_ICON_MAP` pattern).
5. **Start My Account** — Phase A (magic link) + Phase B (bookings list) this session; C/D/E/F follow‑ups.

`tsc --noEmit` clean between every phase. `next build` clean at the end. Spot‑check with Claude Preview after each phase.

---

## Files touched (provisional)

- `src/lib/liteapi.ts` — parser fix (`checkin_start`), add `policies[]` to `HotelDetails`
- `src/app/api/hotels/details/[id]/route.ts` — bump KV key to v3
- `src/app/api/hotels/rates/route.ts` — expose `cancelDeadline` + `paymentTypes`
- `src/app/hotels/[id]/page.tsx` — richer Policies section, consume new fields
- `src/app/hotels/[id]/RoomsTable.tsx` — cancellation deadline + pay‑at‑hotel chips
- `src/app/account/page.tsx` — NEW
- `src/app/account/bookings/page.tsx` — NEW
- `src/app/account/bookings/[ref]/page.tsx` — NEW (Phase C)
- `src/app/api/account/request-link/route.ts` — NEW magic‑link request
- `src/app/api/account/verify/route.ts` — NEW magic‑link verify
- `src/lib/session.ts` — NEW session cookie helpers
- `src/components/Header.tsx` — "My Account" link when session is live

---

## Out of scope this session

- Review score widget (TrustYou / Booking review API)
- "Only N left" urgency chip (only when LiteAPI `remaining` ships reliably)
- Google/Apple SSO
- Date‑change amendments (require cancel + rebook UX flow)
- Pinch‑zoom photos in the room modal
- Editorial property highlights
