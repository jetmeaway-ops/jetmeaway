# Blog Translation Plan — Italian (it)

Self-contained. Hand this file to a fresh session and say *"continue the Italian blog translation"*.

Built on the German run (2026-08-10 → 08-12) and the Spanish run (2026-08-22), which each shipped
545 posts plus `/de/blog` and `/es/blog` routing. Every 🔴 below is a mistake that actually happened
during German or Spanish and cost real time — do not rediscover them.

## Scope

| | |
|---|---|
| Source | `content/posts/*.mdx` — **546** English posts |
| Target | `content/posts/it/*.mdx` — same filenames, same slugs |
| Expected total | **545** (see exclusions) |
| Register | **informal "tu"** — matches the existing Italian UI catalog (`src/messages/it.json`), which uses tu throughout (Cerca / Scegli / Confronta / "il tuo viaggio"; 55 tuo/tua vs 3 suo/sua). 🔴 German used formal *Sie*; Italian must NOT copy that. Use "tu", never "Lei". |

**Exclusions:**

- `scotland-world-cup-2026.mdx` — excluded from German AND Spanish; the 2026 World Cup is over. Exclude it.
- `england-world-cup-2026.mdx` — Spanish and German **kept** this one. Default = translate it (gives 545). Confirm with owner if they now want it dropped everywhere.

## Model and wave size

- **Haiku for every post** (owner rule as of the Spanish run, 2026-08-22). Haiku truncation is
  occasional and random, not size-locked — the image-count / FAQ-count QA after each wave catches the
  rare miss for a targeted re-run. Do NOT use Sonnet, not even for the 16 posts >85KB.
- **Waves of 20 concurrent agents** (owner directive, 2026-08-26 — the hard cap, ran reliably at
  20-at-a-time during the German session). 🔴 At 20 the connection occasionally drops mid-wave (German
  saw "Connection closed mid-response"); the per-wave image/FAQ-count QA is what catches a short file
  for a targeted re-run — never assume all 20 landed without checking. There is also a
  **200-subagent-per-session** cap — at 545 posts you WILL hit it (~28 waves of 20 = 560), so plan for
  ~3 sessions and resume by skipping slugs already on disk.
- Size distribution (measured): **16 posts >85KB, 114 posts 60–85KB**, the rest smaller.
- Resume rule: a post is done iff `content/posts/it/<slug>.mdx` exists. Skip those, never redo them.

## The translation prompt (use verbatim, one post per agent)

> Translate this UK travel blog post from English into ITALIAN (it) for jetmeaway.co.uk.
> Translate it COMPLETELY — first line to last. Never stop early, summarise, or skip any hotel entry,
> section, list item, table row or FAQ. Never write meta-notes such as "continuing…" or "[...]".
>
> SOURCE: `content/posts/<slug>.mdx` → OUTPUT: `content/posts/it/<slug>.mdx`
>
> TRANSLATE: title, excerpt, every FAQ q/a, all body prose, ALL headings, list items, table cell text,
> image alt text, link anchor text.
>
> DO NOT TRANSLATE — copy byte-for-byte: frontmatter KEYS; the `slug` VALUE (it is the URL);
> `category`; `author`; all dates; all URLs and image URLs; IATA codes; currency amounts (£, €);
> hotel/airline/brand names; official place names; all MDX/JSX component tags and markdown syntax.
>
> STYLE: natural, idiomatic **Italian using "tu"** (informal, matching the site UI — never "Lei").
> `readTime` → "24 min di lettura". Legal/visa/permit terms: translate AND keep the English in
> parentheses on first use. Italian has no English title case — in headings capitalise only the first
> word and proper nouns.
>
> Reply only with: EN word count, IT word count, FAQ count, numbered-entry count, and the final
> numbered entry, to prove the file is complete end to end.

## 🔴 QA — these gates caught real bugs in German and Spanish. Run ALL of them.

**Reuse the committed tooling.** Copy `content/es-qa/` → `content/it-qa/` and swap `es`→`it` /
`Spanish`→`Italian` inside each script. **`audit-full.js` is the one that matters** — it compares every
translated file to its EN source (frontmatter fidelity, external+internal link multisets, image parity,
MDX tag parity, body-FAQ presence, stub detection) and exits 1 on blockers. It caught **303 real defects
in 236 Spanish files** that translation-time QA had passed clean twice. Also present:
`fix-frontmatter-parity.js`, `fix-link-parity.js`, `fix-image-parity.js`, `fix-fm-quotes.js`,
`fix-fm-links.js` (🔴 that last one strips EXTERNAL links from frontmatter only — EN legitimately has
*internal* `](/...)` links in ~49 files' frontmatter; do not strip those).

🔴 **Translation-time QA is NOT enough — you must audit IT against the EN source.** The Spanish corpus
passed parse / image-count / FAQ-count checks and was called clean before the EN-vs-ES audit found:
`category` translated in 121 files (feeds JSON-LD `articleSection`), `ctaCity` translated in 17 (breaks
`/hotels?city=X` search), the entire body FAQ block missing from 11 posts, ~150 dropped links, a shifted
image sequence putting the wrong photo on 145 hotels. Assume Italian will do the same — the audit is the
only thing that finds it.

**1. gray-matter parse, every file.** The single most important gate. 🔴 In German a curly-open `„`
closed with a straight ASCII `"` broke YAML frontmatter in **103 of 545 files**, and regex QA missed it.
Italian uses `«»` and `""`, so the same class of bug is likely. Parse with the repo's own library:

```
node -e "const m=require('./node_modules/gray-matter'),fs=require('fs');let ok=0,bad=[];for(const f of fs.readdirSync('content/posts/it').filter(x=>x.endsWith('.mdx'))){try{const p=m(fs.readFileSync('content/posts/it/'+f,'utf8'));p.data.slug?ok++:bad.push(f)}catch(e){bad.push(f+' '+e.message.split('\n')[0])}}console.log('parsed OK '+ok);bad.forEach(x=>console.log('  '+x))"
```

Parse the ENGLISH sources the same way — if EN passes 546/546 and IT fails, the translation introduced it.

**2. Structure parity vs source** — line count, FAQ count, image count, and an identical `slug:` line.
🔴 A FAQ-count mismatch is NOT automatically a translation bug: three Spanish posts tripped it because
the ENGLISH file was the broken one (frontmatter vs body drift). Before deleting anything from an IT
file over a count mismatch, diff EN frontmatter vs EN body first.

**3. No leftover English/Spanish.** 🔴 Haiku left the author's tic word "genuinely" untranslated in 330
spots across 77 German files, and botched a recurring heading template in 42 more. Grep the finished IT
corpus for: `genuinely`, `min read`, `Getting There`, `The Scout's Take`, and any stray Spanish (`¿`, `¡`).

**4. No truncation or leaked agent notes** — grep for `continuing`, `[continu`, `continua qui`, `Poiché`.

**5. 🔴 Mojibake is usually FAKE.** Windows PowerShell 5.1 reads UTF-8 as CP-1252, so `£` displays as
`Â£`, `è` as `Ã¨`. Always read as UTF-8 — `[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)` — before
believing it. Write without BOM: `New-Object Text.UTF8Encoding($false)` (a BOM before `---` breaks YAML).

## Code changes to serve `/it/blog`

The German + Spanish builds made this reusable, so it is small. 🔴 The Spanish plan's file list MISSED
`RelatedPosts.tsx` and `DATE_LOCALE` — both are included below.

| File | Change |
|---|---|
| `src/lib/blog.ts` | `PostLocale` → add `'it'`; `TRANSLATED_LOCALES` → `['de','es','it']`; `DATE_LOCALE` → add `it: 'it'` |
| `src/i18n/config.ts` | `BLOG_LOCALES` → add `'it'` (this alone re-points the Blog nav link) |
| `src/app/it/blog/[slug]/page.tsx` | copy the `es` file, swap `'es'` → `'it'` |
| `src/app/it/blog/page.tsx` | copy the `es` listing, translate the hero copy (values below) |
| `src/components/blog/BlogPostArticle.tsx` | add an `it` entry to `STRINGS` and `IN_LANGUAGE` (values below) |
| `src/components/blog/RelatedPosts.tsx` | add `it: 'Leggi anche'` to the `HEADINGS` map |

hreflang, canonicals, the sitemap, the language switcher and the in-body link localisation are all
already generic — they read `TRANSLATED_LOCALES` or the page's own alternates. **No extra work.**
🔴 Only add `'it'` to `BLOG_LOCALES` once the articles exist, or the nav link points at a 404.

**Turnkey copy — `BlogPostArticle.tsx` STRINGS + IN_LANGUAGE:**

```ts
// IN_LANGUAGE
it: 'it',

// STRINGS.it  (informal tu, matching the UI — do NOT copy German Sie)
it: {
  backToBlog: 'Torna al blog',
  liveAlert: 'Avviso in tempo reale · Aggiornato',
  by: 'Di',
  breadcrumbHome: 'Home',
  breadcrumbBlog: 'Blog',
  ctaHeading: 'Pianifica ora il tuo viaggio del 2026',
  ctaBody:
    'Usa il JetMeAway Scout per confrontare i prezzi in tempo reale di oltre 15 fornitori affidabili. Nessuna commissione di prenotazione.',
  ctaButton: 'Inizia a cercare',
},
```

**Turnkey copy — `src/app/it/blog/page.tsx` (from the `es` file):**

- `metadata.title`: `'Blog di viaggi | JetMeAway'`
- `metadata.description`: `'Consigli di viaggio, guide alle destinazioni e trucchi dal tuo Scout di viaggi personale. I migliori hotel, voli, pacchetti e offerte eSIM per il 2026.'`
- canonical + `it` alternate → `https://jetmeaway.co.uk/it/blog`; keep en/de/es/x-default, add the `it` line
- `openGraph.locale`: `'it_IT'`
- badge: `📝 Blog di viaggi` · H1: `Consigli e <em>guide</em> di viaggio`
- subhead: `Idee concrete dal tuo Scout di viaggi personale — destinazioni, offerte e strategie per il 2026.`
- card link: `` `/it/blog/${post.slug}` `` · `formatPostDate(post.date, 'it')`
- empty state: `Ancora nessun articolo — torna presto.`

## 🔴 Build risk — check before merging

German took the build 546 → 1,187 pages and it FAILED: `getAllPosts()` re-parsed the whole corpus on
every page, blowing Next's 60s-per-page budget — and it failed on an ENGLISH post, so it would have
broken the existing blog. Fixed by the production-only corpus cache now in `src/lib/blog.ts`.

Spanish took it to ~1,732 pages and built in ~52s (CI). **Italian takes it to ~2,277 pages.** The cache
should still hold but **measure it**, and watch Vercel's build limit.

🔴 Never trust `npm run build; echo $?` inside a compound command — it once reported exit 0 on a build
that had actually failed. Write `REAL_EXIT=$?` into the log and grep for it, plus `Export encountered an error`.

## Rollout

1. Translate in waves into `content/posts/it/`, resume-safe.
2. Full-corpus QA + `it-qa/audit-full.js` (above). Fix everything before opening any PR.
3. **PR 1 — content only** (~545 files). Build in a clean worktree already on origin/main; stage ONLY
   `content/posts/it/` to avoid the main-repo phantom diffs.
4. **PR 2 — routing + hreflang + sitemap.** Verify against a PRODUCTION build, not build-green: an
   Italian article renders Italian, hreflang lists en + de + es + it + x-default reciprocally, `/it/blog`
   lists every post, canonical is on the `/it` URL, sitemap gains 545 it URLs, and `/blog` + `/de/blog`
   + `/es/blog` are unchanged. Use `grep -i hreflang` (React emits camelCase `hrefLang`).
5. Submit for indexing — Google (GSC: resubmit the sitemap, request-index the `/it/blog` hub — owner's
   browser task) and Bing (IndexNow via `scripts/indexnow-ping.mjs`; verify the key file returns 200
   first or the whole batch is silently rejected).

## Timing (owner's own rule)

Owner watches GSC indexing 3–4 weeks after each language before starting the next. German went live
2026-08-12, Spanish 2026-08-22. Judge Italian on **mobile clicks**, not impressions (~81% of GSC
impressions are desktop AI fan-out noise). Prepared, not started — fire when the Spanish signal looks good.

## Progress

| Date | Batch | Posts | Total | Notes |
|------|-------|-------|-------|-------|
| 2026-08-26 | — | 0 | 0 / 545 | plan prepared, not started |
