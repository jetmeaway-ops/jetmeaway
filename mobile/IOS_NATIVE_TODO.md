# iOS native targets — owner action checklist for Phase 8

The JS side of Phase 8 (Live Activities, Widgets, Spotlight, Siri) is fully
scaffolded and committed. The remaining steps are Apple Developer portal
config + Swift target additions. Each one is a one-time setup.

When all of these land, every `bridge?` no-op in
`mobile/src/services/{spotlight,intents,live-activities}.ts` and
`mobile/src/widgets/client.ts` becomes a real call into native code.

## 1. App Group container — required for Widgets + Live Activity to share
   data with the host app

1. https://developer.apple.com/account/resources/identifiers — sign in
2. Identifiers → App Groups → click "+" → register
   - Description: `JetMeAway shared`
   - Identifier: `group.uk.co.jetmeaway.app`
3. Identifiers → App IDs → `uk.co.jetmeaway.app`
   - Capabilities → enable App Groups → tick `group.uk.co.jetmeaway.app`
   - Save
4. Profiles → revoke + regenerate the JetMeAway iOS Distribution
   provisioning profile (so the new App Group entitlement is included)
5. Re-add this block to `mobile/app.json`'s `ios.entitlements`:
   ```json
   "com.apple.security.application-groups": ["group.uk.co.jetmeaway.app"]
   ```
   (it was removed in commit `03bac51` because the existing profile
   didn't include the App Group capability)
6. Run `eas build --profile production -p ios` again. EAS auto-pulls the
   updated profile.

## 2. Widget Extension target — Swift, WidgetKit

This needs Xcode on macOS (or `eas-cli` workflow trigger). Steps:

1. On a Mac with Xcode 15+: open `mobile/ios/JetMeAway.xcworkspace`
2. File → New → Target → Widget Extension
3. Name: `JetMeAwayWidgets`
4. Include Live Activity: ✅
5. In `Signing & Capabilities` for the new target:
   - Bundle ID: `uk.co.jetmeaway.app.widgets`
   - Add `App Groups` capability → tick `group.uk.co.jetmeaway.app`
6. Implement `Provider`, `Entry`, and one `Widget` per size (Small,
   Medium, Large). The widget reads from `UserDefaults(suiteName:
   "group.uk.co.jetmeaway.app")` — JSON under key `widget:state:v1`,
   shape: `mobile/src/widgets/types.ts → WidgetState`
7. Refresh policy: `Timeline(entries:, policy: .after(.now + 30 * 60))`
8. Commit `ios/JetMeAwayWidgets/*` and `ios/JetMeAway.xcodeproj/project.pbxproj`
9. Re-run `eas build` — EAS picks up the new target

## 3. Live Activity target

Same target as Widget Extension above (ActivityKit lives there). Add a
`TripActivityAttributes` struct matching the JS-side `WidgetTripSnapshot`
+ implement the `Widget` for `ActivityConfiguration`.

Bridge: add a `LiveActivitiesBridge.swift` module to the host app that
exposes `start/update/end` to RN. The JS side at
`mobile/src/services/live-activities.ts` already calls these.

## 4. Spotlight indexing — `SpotlightBridge.swift`

In the host app target, add a Swift module exposing `index/remove/
removeAll` to RN. Use `CSSearchableIndex.default()`. Bridges hooked from
`mobile/src/services/spotlight.ts`.

## 5. Siri Shortcuts (App Intents) — `IntentsBridge.swift`

Build with the iOS 16 `App Intents` framework. Five intents per
`mobile/src/services/intents.ts`. App Intents donate via
`donate(intent:)` — RN side already wired.

## 6. Background geofencing (opt-in)

Owner-toggleable in `Settings → Notifications`. iOS region monitoring +
push notification when entering 1km geofence around upcoming-trip
airports. Needs `Info.plist` `NSLocationAlwaysAndWhenInUseUsageDescription`
update + `Background Modes → Location updates` capability.

## 7. App icon Quick Actions

Static via `Info.plist` → `UIApplicationShortcutItems`:
- Search (icon: search)
- My Trips (icon: airplane)
- Saved Searches (icon: bookmark)

Each maps to a URL scheme deep link the existing expo-router setup
already handles.

---

## Order of work (recommended)

1. App Group registration (required for everything else)
2. Re-enable App Group entitlement in `app.json` + EAS build
3. Widget Extension + Live Activity target (single Xcode addition)
4. Spotlight bridge
5. Siri Intents bridge
6. Geofencing
7. Quick Actions

Steps 1–2 unblock TestFlight Build #16. Steps 3–7 ship as TestFlight
updates one by one once Build #16 is stable.
