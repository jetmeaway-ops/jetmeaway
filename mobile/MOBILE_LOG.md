# MOBILE_LOG — JetMeAway Expo App

Single source of truth for the mobile app submission state. Every icon regen, version bump, store submission and reviewer response gets logged here. Same discipline as `BACKLOG.md` + `PREMIUM_PLAN_Vn.md` for the web side — save first, context-switch later.

**Project:** Expo (React Native), EAS cloud build
**Package / bundle id:** `uk.co.jetmeaway.app` (locked — do NOT change)
**EAS project id:** `faf61588-3700-4917-acbe-bc9a3569fc33`
**Play Console listing:** live (older version still published)

---

## CANONICAL BRAND (2026-04-21)

User decision, 2026-04-21: **this is the one and only JetMeAway mark going forward. Do not regenerate from any other source. Do not mix with the old yellow/green text-logo that caused the Play Store rejection.**

### The mark (per user, 2026-04-21)
Two accepted forms:
1. **Icon form** — circular badge, blue (`#1458B5`-ish) right half + yellow/gold (warm sunrise-orange) left half, **white airliner silhouette** (real aircraft — fuselage, swept wings, tail stabilisers — NOT a geometric paper-plane) rising from the lower-left to upper-right, with a white vapor swoosh arcing beneath. Used anywhere an app icon / avatar / favicon is needed. **Explicit user instruction 2026-04-21: "i dont want paper plan i told u many time i need my logo" — the plane MUST be an actual aircraft silhouette.**
2. **Horizontal lockup** — the same icon on the left + the wordmark "Jetmeaway" in dark navy (deep navy, near `#0A1628`), bold italic, vapor tail arcing under the letters. Used for headers, letterheads, landing heroes.

### ⚠ Spelling note for a later decision
The lockup reads **"Jetmeaway"** (lowercase m), not **"JetMeAway"** (camel case as used site-wide + in Play Store title). We are NOT resolving this now — it is queued as a brand consistency item to discuss after the hotel/room work. For the current icon-rejection fix, we ignore the wordmark and work only with the circular icon mark, which sidesteps the spelling question.

### Source file — SHIPPED 2026-04-21 (revised)
Extracted directly from the user's actual logo file `public/Jetmeaway logo for app.jpeg`. The user's instruction was explicit: **"i dont want paper plan i told u many time i need my logo" / "y cant u adjest our logo ?"** — so the app icons now derive from the user's real logo raster, not a hand-drawn SVG.

- `mobile/assets/brand/icon-canonical.png` — 1024×1024 raster of the circular mark with transparent background outside the circle. Extracted 2026-04-21 from the sky-blue-backed source JPEG (circle bbox 120,395 → 326,601 ≈ 206×206; bg-match alpha-threshold removed the pale-blue sky; upscaled via lanczos3 to 1024×1024). Used for all 3 app icon outputs.
- `mobile/assets/brand/wordmark-canonical.svg` — horizontal lockup (icon + "Jetmeaway" wordmark). Kept for reference only — not used for app icon generation.

**Everything in the app and Play Console must derive from `icon-canonical.png`. No hand-drawn redraw is valid — the user has rejected two such attempts already.**

### Archived (pre-canonical / wrong, do NOT reuse)
- `mobile/assets/brand/icon-source.archive.svg` — solid-blue variant, pre-canonical (from 2026-04-15 build).
- `mobile/assets/brand/adaptive-foreground.archive.svg` — solid-blue adaptive variant, pre-canonical (from 2026-04-15 build).
- `mobile/assets/brand/icon-canonical.handdrawn.archive.svg` — FIRST hand-drawn attempt (paper-plane triangles). Rejected by user 2026-04-21 "i dont want paper plan". Kept for audit only — never ship.
- `mobile/assets/brand/icon-canonical-foreground.handdrawn.archive.svg` — same as above, adaptive variant. Same rejection.

---

## ASSET INVENTORY — post-fix 2026-04-21

| File | Purpose | Source (canonical) | State |
|---|---|---|---|
| `mobile/assets/images/icon.png` | iOS main + Android legacy fallback (1024×1024) | `icon-canonical.png` | ✅ regenerated 2026-04-21 from user's actual logo |
| `mobile/assets/images/adaptive-icon.png` | Android adaptive foreground (1024×1024, full-bleed logo) | `icon-canonical.png` | ✅ regenerated 2026-04-21 from user's actual logo |
| `mobile/assets/images/splash.png` | App splash (1284×2778) | `splash-source.svg` | ⏳ not in rejection scope — audit separately |
| `mobile/assets/store/play-store-icon-512.png` | Play Console listing hi-res icon (512×512) | `icon-canonical.png` | ✅ regenerated 2026-04-21 from user's actual logo |
| `mobile/assets/store/feature-graphic.png` | Play Console feature graphic (1024×500) | `feature-graphic.svg` | ⏳ pre-canonical — audit before next-next submit |
| `mobile/assets/brand/icon-source.archive.svg` | Old master | — | 🗄 archived, do not use |
| `mobile/assets/brand/adaptive-foreground.archive.svg` | Old adaptive master | — | 🗄 archived, do not use |
| `mobile/assets/brand/icon-canonical.handdrawn.archive.svg` | Hand-drawn attempt #1 (paper-plane) | — | 🗄 archived, rejected by user |
| `mobile/assets/brand/icon-canonical-foreground.handdrawn.archive.svg` | Hand-drawn attempt #1 adaptive | — | 🗄 archived, rejected by user |

Regeneration is automated via `mobile/scripts/regen-icons.mjs` — run any time a canonical SVG changes.

---

## VERSION HISTORY

| Version | versionCode | Date | Notes |
|---|---|---|---|
| 1.0.0 | 1 | (live on Play Store) | First release. Older version remains published post-rejection per Google. |
| 1.0.1 | 2 | (attempted 2026-04-21, rejected) | **REJECTED** — Misleading Claims / App does not match store listing. Launcher icon ≠ hi-res store icon. |
| 1.0.2 | 9 | 2026-04-21 | Icon fix — all 3 PNGs derive from user's actual logo (`public/Jetmeaway logo for app.jpeg` extracted to `mobile/assets/brand/icon-canonical.png`). Note: local `app.json` versionCode = 3 is **cosmetic** — `eas.json` has `appVersionSource: "remote"` so EAS's server-side counter auto-incremented 8 → 9. Play Store still accepts (monotonic above live versionCode 1). |

### Build log for 1.0.2 (9) — 2026-04-21

- **Attempt 1 (build id `b74f3a77-20cf-4908-8a6d-f065596beb7d`)** — FAILED at "Fail job" step after 12s with `"package.json does not exist in /home/expo/workingdir/build/mobile"`.
  - Root cause: `mobile/.easignore` had `/package.json` and `/package-lock.json` as root-anchored patterns. gitignore semantics for an `.easignore` at `mobile/.easignore` interpret leading-`/` paths relative to `mobile/`, so those patterns were excluding `mobile/package.json` (and `mobile/package-lock.json`, `mobile/tsconfig.json`, `mobile/vercel.json`) from the upload. Previous author's comment "won't clash with mobile/package.json since that's what EAS needs" was incorrect.
  - Fix applied: rewrote `.easignore` to use unanchored, name-based patterns (`src/`, `next.config.js`, etc.) which match the web-app files wherever they sit in the archive while leaving `mobile/`'s own `package.json`/`tsconfig.json`/`vercel.json` intact. **Never add a `/<filename>` pattern to `mobile/.easignore` without verifying `mobile/<filename>` doesn't exist.**
- **Attempt 2** — pending re-run of `eas build --platform android --profile production`.

---

## OUTSTANDING — next actions (user to execute)

Steps 1–3 are done on disk as of 2026-04-21. Steps 4–8 are the remaining manual actions.

1. ✅ **Canonical raster** — `icon-canonical.png` extracted directly from user's `public/Jetmeaway logo for app.jpeg` (rev 2026-04-21 per user: "y cant u adjest our logo"). Wordmark SVG kept for reference.
2. ✅ **3 PNGs regenerated** — `icon.png`, `adaptive-icon.png`, `play-store-icon-512.png` via `node scripts/regen-icons.mjs`, all deriving from the user's actual logo raster.
3. ✅ **`app.json` bumped** — `version: 1.0.2`, `versionCode: 3` (2 intentionally skipped).
4. ⏳ **EAS production build** — user runs: `cd mobile && eas build --platform android --profile production`. ~15–20 min cloud build. Returns `.aab` download URL.
5. ⏳ **Upload new AAB** — Play Console → Production → Create new release → attach AAB → Save.
6. ⏳ **Re-upload 512×512 hi-res icon** — Play Console → Main store listing → App icon → upload `mobile/assets/store/play-store-icon-512.png` → Save.
7. ⏳ **Submit for review** with release note: "Launcher icon and hi-res store icon now match per Misleading Claims policy."
8. ⏳ **Log outcome** back in this file under Version History (approval date / any follow-up reviewer notes).

Secondary (defer until after the icon fix ships):
- Resolve "Jetmeaway" vs "JetMeAway" spelling between wordmark and Play Console title. If wordmark wins → update Play Store app name. If Play Store title wins → redo wordmark. Either way is fine, just needs a decision.
- Audit `feature-graphic.png` against the new brand.
- Audit `splash.png` — probably fine but worth re-checking against canonical.
- iOS App Store submission — pending separately; same icon fix applies.

---

## RULES for this file

1. Before any mobile submission, update the Version History row and log the exact assets uploaded.
2. Every regenerated icon must derive from `icon-canonical.png` (the user's actual logo). **Do NOT redraw the logo into an SVG — the user has rejected two such attempts. Always use the raster master.**
3. If a higher-res or transparent-background version of the logo becomes available, replace `icon-canonical.png` and rerun the regen script; do not add parallel sources.
4. Every rejection email gets logged verbatim (or path to the full email) under the version row that was rejected.
