# JetMeAway Maestro E2E flows

End-to-end smoke tests for the React Native app. Same YAML runs on iOS
simulator and Android emulator — write once, cover both stores.

## Why

Before today (2026-05-16) we caught form-handoff bugs only when owner
tested a TestFlight build by hand. The native Hotels form had three
silent bugs in Build 28 — no rooms picker, UTC date drift, destination
dropped on handoff — and `npm run monkey:*` couldn't see them because
the monkey suite only hits the website API.

These flows close that gap. Each one taps into a real surface, fills
the visible form, and asserts the WebView lands on the expected page
with the expected text.

## Install Maestro

```sh
# macOS / Linux
curl -fsSL "https://get.maestro.mobile.dev" | bash

# Windows (PowerShell)
iwr https://get.maestro.mobile.dev/install.ps1 -useb | iex
```

Or with Homebrew: `brew tap mobile-dev-inc/tap && brew install maestro`.

After install, restart your terminal and confirm: `maestro --version`.

## Run

```sh
# from repo root
cd mobile

# all flows on the currently-attached device or sim
maestro test .maestro/

# single flow
maestro test .maestro/03-search-tab-hotels.yaml

# pick a specific iOS simulator
maestro --device "iPhone 16 Pro" test .maestro/

# Android emulator
maestro --device emulator-5554 test .maestro/
```

Each flow file starts with `appId: uk.co.jetmeaway.app` — same bundle
ID for both stores, so no platform switch needed.

## Flow inventory

| # | File | What it covers |
|---|---|---|
| 00 | launch.yaml | App opens, lands on a known tab |
| 01 | onboarding.yaml | Welcome → Location → Notifications → Sign In skip → Discover |
| 02 | discover-tab.yaml | Discover hero + Hot deals carousels + "More to do" cards |
| 03 | search-tab-hotels.yaml | Hotels tile → form → URL handoff (catches the 3 bugs fixed 2026-05-16) |
| 04 | search-tab-flights.yaml | Flights tile → form → URL handoff |
| 05 | search-tab-cars.yaml | Car-hire tile → form → URL handoff |
| 06 | search-tab-packages.yaml | Packages tile → form → URL handoff |
| 07 | search-tab-esim.yaml | eSIM card → WebView /esim |
| 08 | search-tab-insurance.yaml | Travel-insurance card → WebView /insurance |
| 09 | trips-tab.yaml | Trips tab loads, segment switches |
| 10 | profile-tab.yaml | Profile tab loads, version footer visible |

## CI

Maestro Cloud is paid. For free CI on a Mac runner (GitHub Actions
`macos-latest`) you can run `maestro test .maestro/` post-EAS build.
Wire-up not done yet — see project memory `feedback_maximum_profile_depth`
for the bias toward shipping things end-to-end vs. half-done.

## When a flow fails

1. Re-run with `maestro test --debug-output debug/` — captures
   per-step screenshots + view hierarchy so you can see exactly which
   element couldn't be tapped or wasn't visible.
2. Open `debug/` and look at the screenshot for the failed step.
3. Most failures = text label changed in code without updating the
   flow. Either update the flow or revert the label.

## Editing flows

When you add a new tab/tile/field in the app, add an `assertVisible:`
to the relevant flow. Keep flows under 80 lines each — if it's getting
longer, split.
