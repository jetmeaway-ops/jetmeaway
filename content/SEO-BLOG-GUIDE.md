# JetMeAway Blog SEO Guide — MANDATORY for every new post

Owner directive 2026-07-02. Every session/agent writing or editing blog posts MUST follow
this guide. It encodes what the data (GSC + Vercel + Clarity) has taught us. If a rule
here conflicts with an older habit, this guide wins.

## Why this guide exists

We are a small site (~106 Google clicks / 28 days as of 2026-07-02). Broad head terms
("best hotels in paris") are owned by Booking.com, TripAdvisor, Kayak and the newspapers —
we appear around position 9-10 and get impressions but almost no clicks. Small sites win
on **specific, long-tail searches the giants don't write dedicated pages for**, and on
**AI answers** (ChatGPT is our #2 real traffic referrer).

## 1. Titles — specific beats broad. ALWAYS.

Formula: **[intent] + [place] + [qualifier(s)] + [year]**
Qualifiers: budget cap, neighbourhood/landmark, audience, season, trip type.

| ❌ Don't (giants win) | ✅ Do (we can win) |
|---|---|
| Best Hotels in Paris 2026 | Best Hotels in Paris Under £150 Near the Eiffel Tower (2026) |
| Best Hotels Barcelona | Where to Stay in Barcelona With Kids — Quiet Areas Near the Beach (2026) |
| Cheap Flights to Spain | Cheapest Days to Fly London → Malaga This Autumn (2026 data) |
| Rome Travel Guide | 3 Days in Rome on £300 — Full Budget Breakdown (2026) |

- One PRIMARY long-tail phrase per post; put it in the H1, title tag, first paragraph, URL slug.
- Questions make great H2s ("Which arrondissement is best for a first visit?") — they win
  featured snippets and AI citations.
- Existing indexed posts: do NOT rename H1/URL (resets earned rankings). Sharpen the
  `<title>` tag with qualifiers instead, and expand content (see §2).

## 2. Structure — the 3-tier hotel format (new standard)

Every city hotel post uses price tiers, ~30 hotels TOTAL in the main post:

1. **Top / luxury — ~10 hotels**
2. **Mid-range — ~10 hotels**
3. **Budget / economical — ~10 hotels**

**Do NOT stuff 60-70 hotels into one post.** Page weight (one photo per hotel) kills Core
Web Vitals, and thin per-hotel text reads as spam. Instead:

- The full budget list (30-40 cheap hotels) becomes its OWN dedicated post:
  *"Cheap Hotels in [City] Under £X (2026)"* — its own long-tail title, its own rankings.
  (Model: the Disneyland Paris economical hotels post.)
- Main post ↔ budget post link to each other prominently (hub-and-spoke).
- Same split works for audiences: family post, romantic post, business post — each a spoke.

Per hotel, minimum: real photo, 2-4 sentences of SPECIFIC value (what it costs roughly,
what's near it, who it suits), star rating, area. No filler adjectives.

## 3. Updating old posts (encouraged — do this regularly)

- KEEP the URL and H1. Add new sections (e.g. "Economical picks under £100"), update
  prices/facts, bump `dateModified`.
- Every old "best hotels" post should gain a budget tier + a link to its dedicated
  cheap-hotels spoke post when that exists.
- Updating an old post = freshness signal + new long-tail phrases. It is often better
  ROI than a brand-new post.

## 4. Images — hard rules (regressions have burned us)

- **NEVER invent Unsplash IDs** — hallucinated IDs 404'd on Marseille/Bordeaux heroes.
  Every image URL must be verified to load AND show the right subject before commit.
- Hotel photos: LiteAPI → Google Places → Wikimedia chain. **Always pass a unique
  hotelId per hotel** — the google-info route caches by hotelId; reusing one gives
  duplicate photos across hotels (Disneyland regression, fixed 2026-07-02).
- Verify hotels are REAL and DISTINCT — Google resolves multiple brand names to the same
  building; dedupe before publishing (5 duplicates shipped in the Disneyland post).
- No generic stock photos for named hotels. Ever.

## 5. AEO — write for AI assistants too (ChatGPT = our #2 referrer)

- Answer-first: the H1's question answered in the first 2-3 sentences, plainly.
- 20-30 FAQs per major post with direct one-paragraph answers (FAQPage JSON-LD emits
  automatically from the FAQ format).
- Concrete numbers (prices, distances, journey times) — AI assistants cite specifics.
- Tables for comparisons — snippets and AI both lift them.

## 6. Conversion — every post must feed the funnel

- Blog readers convert ~10x worse than searchers. Give every post booking exits:
  in-content links to `/hotels?city=X` and `/flights?to=XXX` with intent phrasing
  ("check live prices for these dates"), plus clickable comparison-table rows
  (Clarity showed dead-clicks on static tables — rows must link).
- Internal links: every new post links to 2-3 related posts AND receives links back
  from them (edit the old posts — don't publish orphans).

## 7. Honesty rules (non-negotiable, owner + compliance)

- No invented stats, review counts, or "thousands of travellers" claims.
- No Booking.com mentions anywhere (not a partner — standing owner rule).
- Prices labelled as estimates/from-prices unless live-verified.
- Facts about events (e.g. World Cup results) verified against a source on the day
  of writing — never from model memory.

## 8. Publishing checklist (every post, before commit)

- [ ] Long-tail title + slug, primary phrase in H1/title/first para
- [ ] 3-tier structure (or single-intent spoke post), ~30 hotels max in main post
- [ ] Every image verified live + correct subject; unique hotelId per hotel
- [ ] Hotels deduped (no same-building duplicates)
- [ ] 20+ FAQs, answer-first intro
- [ ] Booking CTAs + 2-3 internal links in AND out
- [ ] `date`/`dateModified` correct; build passes; post renders locally
