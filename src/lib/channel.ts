/**
 * Channel attribution — detect whether an inbound request originates from
 * the JetMeAway iOS app, the Android app, or the web.
 *
 * Why server-side UA detection (not a client-supplied query param):
 * The mobile apps render JetMeAway pages inside a WebView with
 * `applicationNameForUserAgent="JetMeAway/1.x.x Mobile"` (mobile/App.tsx
 * line ~328). Every fetch fired from inside that WebView — including
 * /api/hotels/start-booking — carries that signature in the UA header,
 * so the backend can attribute channel without any app re-release.
 *
 * Used by:
 *   - /api/hotels/start-booking — persists `channel` on PendingBooking
 *     and feeds the £5-off-2nd-booking-via-app eligibility engine
 *     (src/lib/promo.ts).
 *
 * The regex is deliberately permissive on the version segment so future
 * patch bumps (1.1.0, 1.2.5, …) don't break detection. Any UA carrying
 * the literal substring `JetMeAway/<digits-and-dots> Mobile` is treated
 * as mobile-app traffic; iOS vs Android is then inferred from the rest
 * of the UA. Anything without the signature is `web`.
 */

export type Channel = 'ios' | 'android' | 'web';

const APP_UA_SIGNATURE = /JetMeAway\/[\d.]+\s+Mobile/;

export function detectChannelFromUA(userAgent: string | null | undefined): Channel {
  if (!userAgent || !APP_UA_SIGNATURE.test(userAgent)) return 'web';
  if (/Android/i.test(userAgent)) return 'android';
  // The iOS WebView UA on iPhone/iPad usually contains "iPhone", "iPad",
  // or "iOS"; we also accept "Mac OS X" because iPadOS still reports as
  // Mac on some browser builds.
  if (/iPhone|iPad|iOS|Mac OS X/i.test(userAgent)) return 'ios';
  return 'web';
}
