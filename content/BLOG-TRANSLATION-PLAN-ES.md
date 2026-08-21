# Blog Translation Plan — Spanish (es)

Self-contained. Hand this file to a fresh session and say *"continue the Spanish blog translation"*.

Built on the German run (2026-08-10 → 08-12), which shipped 545 posts plus `/de/blog` routing. Every
🔴 below is a mistake that actually happened during German and cost real time — do not rediscover them.

## Scope

| | |
|---|---|
| Source | `content/posts/*.mdx` — **546** English posts |
| Target | `content/posts/es/*.mdx` — same filenames, same slugs |
| Expected total | **545** (see exclusions) |
| Register | **informal "tú"** — matches the existing Spanish UI catalog (`src/messages/es.json`), which uses tú/Elige throughout. 🔴 German used formal *Sie*; Spanish must NOT copy that. |

**Exclusions** (confirm with owner before starting):

- `scotland-world-cup-2026.mdx` — excluded from German too; the 2026 World Cup is over.
- `england-world-cup-2026.mdx` — same reasoning. A German version still exists; owner has not decided.

## Model and wave size

- **Sonnet for every post.** 🔴 Haiku's 32k output cap silently TRUNCATES long posts and garbled two
  of them (khajuraho, majuli). 20 posts are >85KB and 152 are 60–85KB. Sonnet completed a
  19,172-word post in full. Do not use Haiku on this corpus.
- **Waves of 8–10 concurrent agents.** The hard cap is 20 concurrent subagents; 15 Haiku at once once
  caused "Connection closed mid-response" and only 5/15 landed. There is also a
  **200-subagent-per-session** cap — at ~545 posts you WILL hit it, so plan for ~3 sessions.
- Resume rule: a post is done iff `content/posts/es/<slug>.mdx` exists. Skip those, never redo them.

## The translation prompt (use verbatim, one post per agent)

> Translate this UK travel blog post from English into SPANISH (es) for jetmeaway.co.uk.
> Translate it COMPLETELY — first line to last. Never stop early, summarise, or skip any hotel entry,
> section, list item, table row or FAQ. Never write meta-notes such as "continuing…" or "[...]".
>
> SOURCE: `content/posts/<slug>.mdx` → OUTPUT: `content/posts/es/<slug>.mdx`
>
> TRANSLATE: title, excerpt, every FAQ q/a, all body prose, ALL headings, list items, table cell text,
> image alt text, link anchor text.
>
> DO NOT TRANSLATE — copy byte-for-byte: frontmatter KEYS; the `slug` VALUE (it is the URL);
> `category`; `author`; all dates; all URLs and image URLs; IATA codes; currency amounts (£, €);
> hotel/airline/brand names; official place names; all MDX/JSX component tags and markdown syntax.
>
> STYLE: natural, idiomatic **Spanish using "tú"** (informal, matching the site UI). Neutral Spanish
> that reads well in both Spain and Latin America — avoid Spain-only slang and region-specific
> vocabulary where a neutral word exists. `readTime` → "24 min de lectura". Legal/visa/permit terms:
> translate AND keep the English in parentheses on first use. Use Spanish punctuation properly, with
> opening `¿` and `¡`. Spanish has no English title case — in headings capitalise only the first word
> and proper nouns.
>
> Reply only with: EN word count, ES word count, FAQ count, numbered-entry count, and the final
> numbered entry, to prove the file is complete end to end.

## 🔴 QA — these gates caught real bugs in German. Run ALL of them.

**1. gray-matter parse, every file.** The single most important gate.
🔴 In German, a curly-open `„` closed with a straight ASCII quote broke YAML frontmatter in
**103 of 545 files**, and regex-based QA missed it completely. Spanish uses `«»` and `“”`, so the same
class of bug is likely. Parse with the repo's own library, from the repo root:

```
node -e "const m=require('./node_modules/gray-matter'),fs=require('fs');let ok=0,bad=[];for(const f of fs.readdirSync('content/posts/es').filter(x=>x.endsWith('.mdx'))){try{const p=m(fs.readFileSync('content/posts/es/'+f,'utf8'));p.data.slug?ok++:bad.push(f)}catch(e){bad.push(f+' '+e.message.split('\n')[0])}}console.log('parsed OK '+ok);bad.forEach(x=>console.log('  '+x))"
```

Parse the ENGLISH sources the same way for comparison — if EN passes 546/546 and ES fails, the
translation introduced the fault.

**2. Structure parity vs source** — line count, FAQ count (`^\s*-\s*q:`), image count, and an
identical `slug:` line.

**3. No leftover English.** 🔴 Haiku left the author's tic word "genuinely" untranslated in 330 spots
across 77 German files, and botched a recurring heading template in 42 more. Grep the finished corpus
for: `genuinely`, `min read`, `Getting There`, `The Scout's Take`.

**4. No truncation or leaked agent notes** — grep for `continuing`, `[continu`, `se continúa`, `Debido al`.

**5. 🔴 Mojibake is usually FAKE.** Windows PowerShell 5.1 reads UTF-8 as CP-1252, so `£` displays as
`Â£`. Always read as UTF-8 — `[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)` — before believing it.

## Code changes to serve `/es/blog`

The German build made this reusable, so it is small:

| File | Change |
|---|---|
| `src/lib/blog.ts` | `PostLocale` → add `'es'`; `TRANSLATED_LOCALES` → `['de','es']` |
| `src/i18n/config.ts` | `BLOG_LOCALES` → add `'es'` (this alone re-points the Blog nav link) |
| `src/app/es/blog/[slug]/page.tsx` | copy the `de` file, swap `'de'` → `'es'` |
| `src/app/es/blog/page.tsx` | copy the `de` listing, translate the hero copy |
| `src/components/blog/BlogPostArticle.tsx` | add an `es` entry to `STRINGS` and `IN_LANGUAGE` |

hreflang, canonicals, the sitemap, the language switcher and the in-body link localisation are all
already generic — they read `TRANSLATED_LOCALES` or the page's own alternates. **No extra work.**
🔴 Only add `'es'` to `BLOG_LOCALES` once the articles exist, or the nav link points at a 404.

## 🔴 Build risk — check before merging

German took the build from 546 → **1,187** pages and it FAILED: `getAllPosts()` re-parsed the whole
corpus on every page, blowing Next's 60s-per-page budget — and it failed on an ENGLISH post, meaning
it would have broken the existing blog. Fixed by the production-only corpus cache now in
`src/lib/blog.ts`.

Spanish takes this to **~1,732 pages**. The cache should hold (German built in 1m38s locally, 2m12s in
CI) but **measure it**, and watch Vercel's build limit.

🔴 Never trust `npm run build; echo $?` inside a compound command — it reported exit 0 on a build that
had actually failed. Write `REAL_EXIT=$?` into the log and grep for it, plus `Export encountered an error`.

## Rollout

1. Translate in waves into `content/posts/es/`, resume-safe.
2. Full-corpus QA (above). Fix everything before opening any PR.
3. **PR 1 — content only** (~545 files).
4. **PR 2 — routing + hreflang + sitemap.** Verify against a production build: a Spanish article
   renders Spanish, hreflang lists en + de + es + x-default, `/es/blog` lists every post, and English
   is unchanged.
5. Submit for indexing — Google (GSC: resubmit the sitemap, request-index the `/es/blog` hub) and
   Bing (IndexNow via `scripts/indexnow-ping.mjs`, filtered to the new URLs; verify the key file
   returns 200 first, or the batch is silently rejected).

## Timing (owner's own rule)

Owner's stated plan is to **watch GSC indexing for 3–4 weeks after German before starting a second
language.** German went live 2026-08-12, which puts the earliest sensible start at **early September
2026**. This plan is ready to fire the day that signal looks good — prepared, not started.

Why Spanish is the right second language: Spain already appears in the GSC 90-day top-10
(7 clicks / 1,858 impressions) *before any Spanish content existed*, plus the wider Latin American
market. And unlike a UI-only locale, blog articles get their own path-based URLs, so they can actually
rank — a UI translation on the same URL cannot.

## Progress

| Date | Batch | Posts | Total | Notes |
|------|-------|-------|-------|-------|
| 2026-08-12 | — | 0 | 0 / 545 | plan prepared, not started |
