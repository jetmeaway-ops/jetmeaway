# External Linking Plan — All Blog Posts (2026-07-12)

**Why:** Independent SEO review scored our external linking 3/10 — it was the only
fair criticism. 370 posts currently have ZERO external links. Adding 2–4 links to
genuine authority sites per post signals trust to Google and helps rankings. This
is a content-only job — no code changes. **Content edits only = agent's job.
Anything touching code = Fable.**

---

## The rules (read before touching anything)

1. **2–4 external links per post. Never more.** One good link beats four weak ones.
   If a post has no natural fit, 1 link (or zero) is fine — never force it.
2. **NEVER invent a URL.** Every link must be opened and checked (page loads, is the
   official site, is in English or has an English version) BEFORE it goes in a post.
   A guessed URL that 404s is worse than no link. This is the same law as
   "never invent Unsplash IDs".
3. **Hotel names keep their JetMeAway deep links. Never replace or double-link them.**
   External links go in the surrounding text, intro, area guides, and FAQ answers only.
4. **Standard markdown links**: `[anchor text](https://example.com/page)`.
   Natural anchor text — write "the official Tunisia tourism board", not "click here"
   and not a bare URL.
5. **Don't break the MDX**: no edits inside `<a id="...">` anchors, frontmatter, or
   tables' structure. After editing each post, confirm it still parses (step 5 below).

## Allowed link types (in priority order)

| Type | Example | Where it fits |
|---|---|---|
| Official tourism board | discovertunisia.com, visitdubai.com, japan.travel | Intro or "getting around" section |
| UK Gov travel advice | gov.uk/foreign-travel-advice/tunisia | FAQ answers about safety / entry rules |
| UNESCO listing | whc.unesco.org/en/list/36 (Medina of Tunis) | Where the post mentions a World Heritage site |
| Official attraction / museum | louvre.fr, bardomuseum.tn | Where that landmark is described |
| Official airport site | Tunis-Carthage official page | FAQ answers about transfers |
| Official metro / rail operator | ratp.fr, tokyometro.jp | "Getting around" / transfer FAQ |
| Official event site | oktoberfest.de, edfringe.com | Only if the post mentions the event |

## Banned — never link to these

- **Booking.com — never, anywhere, for any reason.** (Standing owner rule.)
- Any OTA or competitor: TripAdvisor, Expedia, Agoda, Hotels.com, Kayak, etc.
  (Even our partners — editorial links to them leak the booking away.)
- Blogs, forums, Reddit, Quora, news articles, YouTube.
- Wikipedia — only as a LAST resort when a landmark has no official site,
  max 1 per post.
- Anything with affiliate/tracking parameters.

## Placement recipe (per post)

1. **1 link in the intro or area-guide section** → the country/city official
   tourism board.
2. **1–2 links inside FAQ answers** → gov.uk travel advice for the safety
   question; official airport or metro site for the transfer question.
3. **0–1 link at a landmark mention** → UNESCO page or the attraction's
   official site (e.g. the medina, Bardo Museum, Sagrada Família).

## Work order (one batch at a time, resume-safe)

Work country by country in this order — highest traffic first. Finish, verify, and
commit each batch before starting the next, so a stopped session loses nothing.

1. **Flagships**: las-vegas, paris, london, dubai, rome, istanbul, new-york, tokyo, barcelona, amsterdam
2. Turkey (all posts incl. all-inclusive set) → Spain → UK cities → Italy → Greece
3. France → Germany → Portugal → Netherlands/Belgium → Scandinavia
4. Middle East (UAE/Qatar/Saudi/Jordan/Israel/Oman/Bahrain/Kuwait) → Egypt/Morocco/Tunisia
5. Asia (Japan/Thailand/Vietnam/Malaysia/Philippines/Korea/India/Indonesia) → Caucasus/Central Asia
6. Americas + everything remaining, including the non-hotel posts (flights guides,
   packing, visa posts — these fit gov.uk and official airline/airport links well)

**Efficiency tip:** research each country's link set ONCE (tourism board + gov.uk
advice page + main airport + 1–2 UNESCO/attractions), verify all URLs load, then
apply that same small set across all of that country's posts with per-city
adjustments. Keep a running list in `scratch/external-links-registry.md` of every
verified URL so later batches reuse them instead of re-researching.

## Verification (every batch, before commit)

1. `node scratch/check-external-links.mjs` — reports every external link, flags
   banned domains, and (with `--live`) checks each URL actually responds.
2. `npx tsc --noEmit` still passes (should be untouched — content only).
3. Spot-open 2 posts from the batch in the dev preview and confirm the links
   render and the page still displays correctly.
4. Commit the batch locally with message
   `content(seo): external authority links — <country> (<N> posts)`.
   **Do not push** — the owner bundles pushes.

## What NOT to do

- Don't touch prices, hotel counts, headings, or anything else while in a post —
  this job adds links only.
- Don't add links to posts that already have 4. (12 posts already have some —
  the checker lists them; top them up only if under 4 and the fits are natural.)
- Two research posts (`best-travel-comparison-apps`, `is-it-cheaper-to-book-hotel-
  direct-vs-otas`) are citation posts — exempt from the 4-link cap, leave them alone.
- If a country's official tourism site is dead, broken, or non-English with no
  English toggle — skip that link type for the country, note it in the registry,
  move on. Never substitute a blog.
