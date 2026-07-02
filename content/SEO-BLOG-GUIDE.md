# JetMeAway Blog SEO Guide — MANDATORY for every post (new + redo)

Owner directive 2026-07-02. This guide is written FOR the blog-writing agent (Opus, with
Sonnet doing research). Every session that writes or edits a blog post MUST read and
follow it. If a rule here conflicts with an older habit, this guide wins.

## Why this guide exists

We are a small site (~106 Google clicks / 28 days as of 2026-07-02). Broad head terms
("best hotels in paris") are owned by Booking.com, TripAdvisor, Kayak and the newspapers.
Small sites win on **specific long-tail searches** and **AI answers** (ChatGPT is our #2
real traffic referrer).

**Owner's market read (2026-07-02, treat as strategy):** UK economy is squeezing
families. People who used to book 5★ are hunting budget hotels and cheap flights for
their kids' summer holidays. **Budget content is our biggest opportunity** — the budget
tier is not an afterthought, it is the main event.

## 1. The 45-50 hotel format (owner-mandated standard)

Every city hotel post carries **45-50 hotels in 3 tiers**:

1. **Luxury — 10 hotels** (the dream tier, keeps the "best hotels" relevance)
2. **Mid-range — 10 hotels**
3. **Budget / economical — 25-30 hotels** ← the star of the post

Rules that make this work:

- **Jump-link table of contents at the top** ("Luxury · Mid-range · Budget under £X") so
  budget hunters reach their tier in one tap.
- **"Scout's 3 best budget picks" teaser box near the intro** — the reader who came for
  cheap sees value in the first screen.
- Per-hotel format: real photo, star rating, area, rough price band, 2-4 sentences of
  SPECIFIC value (what's near it, who it suits, the catch if any). Budget entries can be
  2-3 sentences — compact but real. No filler adjectives.
- Budget tier gets its own keyword-rich H2 (e.g. "Cheap hotels in Paris under £120 —
  25 real options") and its own FAQ coverage ("cheapest area to stay in…", "is X area
  safe on a budget…").
- **Page speed is the site team's job, not a reason to cut hotels**: all hotel images
  below the fold use `loading="lazy"`, request widths ≤ 800px from the CDN
  (LiteAPI/Places URLs accept size params), never paste full-resolution originals.
- This is one-time deep research per post — do it properly: verify every hotel exists,
  is distinct, and is bookable (see §4).

Optional extra (bonus visibility, never a replacement): once a city's main post is done,
a dedicated spoke post "Cheap Hotels in [City] Under £X (2026)" can reuse the budget
research with its own long-tail title, cross-linked both ways.

## 2. Titles — specific beats broad. ALWAYS.

Formula: **[intent] + [place] + [qualifier(s)] + [year]**
Qualifiers: budget cap, neighbourhood/landmark, audience, season, trip type.

| ❌ Don't (giants win) | ✅ Do (we can win) |
|---|---|
| Best Hotels in Paris 2026 | Best Hotels in Paris for Every Budget — 50 Real Picks From £60 (2026) |
| Best Hotels Barcelona | Where to Stay in Barcelona With Kids — Quiet Areas Near the Beach (2026) |
| Cheap Flights to Spain | Cheapest Days to Fly London → Malaga This Autumn (2026 data) |

- One PRIMARY long-tail phrase per post: in H1, title tag, first paragraph, URL slug.
- Question H2s ("Which arrondissement is best for a first visit?") win snippets + AI citations.

## 3. THE REDO PROGRAM — upgrading every old post (owner-mandated)

Work through the existing posts one at a time and bring each to the 45-50 format.

**Priority order (by GSC traffic, re-check GSC before starting):**
1. Las Vegas (top clicks) → 2. Prague → 3. Turkey all-inclusive → 4. Seattle → 5. Los
Angeles → 6. Dublin → 7. Vienna → 8. Paris + France cluster (Nice, Lyon, Marseille,
Bordeaux, Cannes) → 9. Dubai → 10. everything else.

**Per-post redo procedure:**
1. KEEP the URL slug and H1 exactly (never reset earned rankings). The `<title>` tag MAY
   gain qualifiers (e.g. append "— 50 Hotels for Every Budget From £49").
2. Keep all existing hotels/content that is accurate; re-verify prices/facts in passing.
3. Research and ADD hotels to reach 10 lux / 10 mid / 25-30 budget. Budget research is
   the deep work — real, currently-operating, bookable properties.
4. Add the tier table of contents + budget teaser box near the top.
5. Add/extend FAQs to 25+ with budget-intent questions.
6. Add booking exits per tier (links to `/hotels?city=X`) + keep internal links intact.
7. Bump `dateModified`. Verify the post builds and renders locally (images loading,
   no MDX errors) before commit.
8. One post per PR/push, following the house deploy rules.

## 4. Images + hotel verification — hard rules (regressions have burned us)

- **NEVER invent Unsplash IDs** — hallucinated IDs 404'd on Marseille/Bordeaux heroes.
  Every image URL must be verified to load AND show the right subject before commit.
- Hotel photos: LiteAPI → Google Places → Wikimedia chain. **Always pass a unique
  hotelId per hotel** — the google-info route caches by hotelId; reusing one gives
  duplicate photos across hotels (Disneyland regression, fixed 2026-07-02).
- **Dedupe**: Google resolves multiple brand names to the same building — 5 duplicate
  hotels shipped in the Disneyland post at only 40 hotels. At 50 hotels this check is
  MANDATORY per post: no two entries may share an address/building.
- No generic stock photos for named hotels. Ever.

## 5. AEO — write for AI assistants too (ChatGPT = our #2 referrer)

- Answer-first: the H1's promise answered in the first 2-3 sentences, plainly.
- 25+ FAQs per major post, direct one-paragraph answers (FAQPage JSON-LD auto-emits).
- Concrete numbers (prices, distances, journey times) — AI assistants cite specifics.
- Tables for comparisons — snippets and AI both lift them.

## 6. Conversion — every post must feed the funnel

- **Hotel deep links (2026-07-02): every hotel NAME in a post links to its own hotel
  page**: `/hotels/<liteapi-id>?city=<City>` (e.g. `/hotels/la_lp6aee8?city=Barcelona`).
  The page opens with live rooms on default dates and a date picker so the reader books
  that exact hotel. To find each hotel's LiteAPI id: call our own API
  `GET /api/hotels?city=<City>&checkin=<future date>&checkout=<+3d>&adults=2` and match
  hotel names to the returned `id` fields (ids look like `la_xxxxxxx`). If a hotel is
  not in the response (not LiteAPI-bookable), link to `/hotels?city=<City>` instead —
  NEVER `/hotels?destination=<hotel name>` (hotel names don't resolve as destinations).
- In-content links to `/hotels?city=X` and `/flights?to=XXX` with intent phrasing
  ("check live prices for these dates"). One booking exit per tier minimum.
- Comparison-table rows must be clickable links (Clarity showed dead-clicks on static tables).
- Every post links to 2-3 related posts AND receives links back from them.

## 7. Honesty rules (non-negotiable)

- No invented stats, review counts, or "thousands of travellers" claims.
- No Booking.com mentions anywhere (not a partner — standing owner rule).
- Prices labelled as estimates/from-prices unless live-verified.
- Event facts (sports, festivals) verified against a live source on the day of writing.

## 8. Publishing checklist (every post, before commit)

- [ ] Long-tail title angle; primary phrase in H1/title/first para (redo: H1+URL unchanged)
- [ ] 45-50 hotels: 10 lux / 10 mid / 25-30 budget, tier jump-links + budget teaser
- [ ] Every image verified live + correct subject; unique hotelId; lazy-loaded; ≤800px
- [ ] Hotels deduped — no two entries share a building
- [ ] 25+ FAQs incl. budget-intent; answer-first intro
- [ ] Booking CTAs per tier + internal links in AND out
- [ ] `date`/`dateModified` correct; local build passes; post renders with images
