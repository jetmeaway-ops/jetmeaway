# Italian translation — wave log & deferred cleanups

Resume-safe: a post is done iff `content/posts/it/<slug>.mdx` exists. Skip those.

## Deferred CORPUS-LEVEL cleanups (run ONCE over all IT files before any PR — do NOT re-translate)

1. **English adjective leaks** → find/replace across all IT files:
   `four-star`→`quattro stelle`, `five-star`→`cinque stelle`, `three-star`→`tre stelle`,
   `two-star`→`due stelle`, `design-led`→`di design`, `live page`→`pagina dei prezzi dal vivo`,
   stray `reviews`→`recensioni`. `self-catering` — review case-by-case (often keep or `con angolo cottura`).
   Wave 1 worst offenders: majorca(70), lanzarote(34), marbella(22), salou(18), benidorm(15), gran-canaria(11).
   Wave 2+ prompt now translates these inline, so the leak should shrink.
2. **Link parity**: `best-all-inclusive-hotels-alanya-2026` has 50 external links vs EN 51 (dropped 1).
   Run the it-qa link-parity fixer over the whole corpus at the end (port `content/es-qa/fix-link-parity.js`).
3. **Line deltas to verify (likely blank-line formatting, not content loss)**: tenerife 330/334, benidorm 330/331.

## QA gates still OWED before PR (need node_modules — run from main repo or after `npm ci`)
- gray-matter parse of every IT file (the YAML curly-quote gate; IT uses «» "" — same bug class as German).
- Full `audit-full.js` (copy `content/es-qa/` → `content/it-qa/`, swap `es`→`it`): frontmatter fidelity
  incl. **category + ctaCity NOT translated**, external+internal link multisets, image parity, body-FAQ presence.

## Wave progress
| Wave | Slugs | On disk | Structure (img parity / truncation) | Notes |
|------|-------|---------|-------------------------------------|-------|
| 1 | andaman, atol-myth, bali-vs-maldives, all-inclusive {alanya,belek,benidorm,bodrum,fethiye,gran-canaria,kusadasi,lanzarote,lloret,majorca,malaga,marbella,marmaris,salou,san-sebastian,side,tenerife} | 20/20 | images 20/20 parity ✅, 0 truncation, all tails Italian | lloret/bali "English tail" were agent-report glosses, files are fine. Cosmetic adjective leaks → cleanup #1. alanya → cleanup #2. |
