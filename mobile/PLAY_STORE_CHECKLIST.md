# Play Store Launch Checklist — JetMeAway

Everything you need to upload the Android app once the Play Console account is approved.

## What I've already done for you

- [x] Generated all app icons (1024×1024 square, transparent adaptive-foreground)
- [x] Generated splash screen (1284×2778)
- [x] Generated Play Store feature graphic (1024×500) at `assets/store/feature-graphic.png`
- [x] Generated Play Store 512×512 icon at `assets/store/play-store-icon-512.png`
- [x] Wrote store listing copy at `assets/store/listing-copy.md`
- [x] Drafted Data Safety form answers at `assets/store/data-safety-answers.md`
- [x] Configured `app.json` with correct bundle id, versioning, permissions
- [x] Configured `eas.json` for development, preview and production builds
- [x] Added location permission strings for iOS and Android

## What you need to do (in order)

### Step 1 — Create Expo account (5 min, only if you don't have one)

1. Go to https://expo.dev and sign up (free)
2. Note your username

### Step 2 — Install EAS CLI and link project (one-off, 5 min)

Open PowerShell in `C:\Users\10ban\OneDrive\Desktop\jetmeaway\mobile` and run:

```
npm install -g eas-cli
eas login
eas init --id new
```

`eas init` will print a project ID and update `app.json` automatically. Also update the `owner` field in `app.json` with your Expo username.

### Step 3 — Run first production build (20 min)

```
eas build --platform android --profile production
```

EAS builds on their cloud servers — no Android Studio needed. You'll get an `.aab` file URL when it's done. Download it.

### Step 4 — Inside Play Console

Once your Play Console account is approved:

1. Create new app → name: JetMeAway → default language: English (UK) → app or game: App → free or paid: Free
2. Accept the declarations
3. **Store listing** tab:
   - App name, short description, full description → copy from `assets/store/listing-copy.md`
   - App icon → upload `assets/store/play-store-icon-512.png`
   - Feature graphic → upload `assets/store/feature-graphic.png`
   - Phone screenshots → need at least 2, see Step 5 below
   - Category: Travel & Local
   - Contact details: email contact@jetmeaway.co.uk, website jetmeaway.co.uk, phone +44 800 652 6699
   - Privacy policy: https://jetmeaway.co.uk/privacy
4. **App content** tab:
   - Privacy policy URL → https://jetmeaway.co.uk/privacy
   - Data safety → copy answers from `assets/store/data-safety-answers.md`
   - Ads → No
   - Content rating → complete the questionnaire (pick "Reference, News or Educational" → no sensitive content)
   - Target audience → 18+
   - News app → No
   - COVID-19 contact tracing → No
   - Data safety → Yes, complete using the answers file
   - Government app → No
   - Financial features → Select "Makes payments". Stripe is your processor.
5. **Production** tab:
   - Create new release
   - Upload the `.aab` from Step 3
   - Release name: 1.0.0
   - Release notes: "Welcome to JetMeAway. Life, not just lodging."
   - Review → Start rollout to production

### Step 5 — Screenshots

You need 2–8 phone screenshots, 1080×1920 or similar portrait aspect.

Fastest way: run the app in an Android emulator or on your own phone, take real screenshots of:
- The home screen with search
- The flights results page
- A hotel detail page with Scout sidebar (once built)
- The explore/discover view

If the app has any rough edges visible, grab clean versions only. Quality over quantity.

### Step 6 — Submit for review

Google's first review usually takes 3–7 days. After approval, the app goes live on Play Store and anyone can install it.

## Important notes

- **Bundle id `uk.co.jetmeaway.app`** is locked in. Do NOT change it, or you'll need to create a new Play Store listing from scratch.
- **Version code** is `1` for first upload. Every subsequent build needs a higher integer. EAS `autoIncrement: true` handles this automatically.
- **Play App Signing** — let Google manage the upload key. Do not opt out. Recovery is much easier.
- **Closed testing** is optional but recommended for the first build. Invite 5–10 friends/family, get 14 days of testing logs, THEN promote to production. Google rewards this pattern with faster subsequent reviews.

## If anything goes wrong

- Build fails → run `eas build --platform android --profile preview` first to get an APK and test locally
- Bundle rejected by Play → read the exact error; most common is missing privacy policy or mismatched package name
- Crashes on startup → check `mobile/App.tsx` entry point and that all fonts load

Ping me with the exact error and I'll fix it.
