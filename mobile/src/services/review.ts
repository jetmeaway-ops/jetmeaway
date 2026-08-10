/**
 * In-app App Store / Play Store review prompts.
 *
 * Wraps expo-store-review (SKStoreReviewController on iOS, In-App Review on
 * Android). Both platforms hard-cap how often the OS actually shows the
 * sheet (iOS: 3×/year per user, and nothing if already rated), so our job is
 * only to CALL requestReview() at genuine positive moments — never on a cold
 * launch, never mid-flow — and gate our own calls so we don't waste the
 * yearly budget.
 *
 * Two triggers (see App.tsx):
 *   1. reviewAfterBooking()        — right after a booking is confirmed/saved.
 *                                     The strongest signal; rare but delighted.
 *   2. maybeReviewAfterEngagement() — a RETURNING user (>=4th session) who has
 *                                     had the app open long enough to see
 *                                     content. Catches the browsing majority
 *                                     while bookings are still low-volume.
 *
 * Added 2026-08-10: the listing had only 2 ratings and no prompt anywhere —
 * ratings are the biggest ASO lever we weren't pulling.
 *
 * NOTE: requires `npx expo install expo-store-review` + a rebuild to activate.
 * The require is guarded so the shell never crashes if the module is absent
 * (e.g. an OTA update landing before the native rebuild ships).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StoreReview: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StoreReview = require('expo-store-review');
} catch {
  StoreReview = null;
}

const K_SESSIONS = 'review:sessions';
const K_LAST_PROMPT = 'review:lastPromptAt';
const DAY = 86_400_000;

// Don't ask a brand-new user; wait until they've come back a few times.
const MIN_SESSIONS = 4;
// Our own cool-downs (Apple/Google also enforce their own, stricter caps).
const COOLDOWN_ENGAGEMENT_DAYS = 120;
const COOLDOWN_BOOKING_DAYS = 45;

async function canPrompt(minGapDays: number): Promise<boolean> {
  if (!StoreReview) return false;
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    // hasAction() is false when the OS won't show anything (already rated,
    // budget spent) — skip so we don't burn our own cool-down for a no-op.
    if (StoreReview.hasAction && !(await StoreReview.hasAction())) return false;
    const last = Number((await AsyncStorage.getItem(K_LAST_PROMPT)) || '0');
    return Date.now() - last > minGapDays * DAY;
  } catch {
    return false;
  }
}

async function prompt(): Promise<void> {
  if (!StoreReview) return;
  try {
    await StoreReview.requestReview();
    await AsyncStorage.setItem(K_LAST_PROMPT, String(Date.now()));
  } catch {
    /* a review prompt must never block or crash the app */
  }
}

/** Count this app session. Fire-and-forget on launch. */
export async function recordSession(): Promise<void> {
  try {
    const n = Number((await AsyncStorage.getItem(K_SESSIONS)) || '0') + 1;
    await AsyncStorage.setItem(K_SESSIONS, String(n));
  } catch {
    /* ignore */
  }
}

/** Returning-user prompt — call once content has loaded and the user has
 *  had a moment to engage (App.tsx delays this after first load). */
export async function maybeReviewAfterEngagement(): Promise<void> {
  try {
    const n = Number((await AsyncStorage.getItem(K_SESSIONS)) || '0');
    if (n < MIN_SESSIONS) return;
    if (await canPrompt(COOLDOWN_ENGAGEMENT_DAYS)) await prompt();
  } catch {
    /* ignore */
  }
}

/** Strong positive moment — call right after a booking is confirmed/saved. */
export async function reviewAfterBooking(): Promise<void> {
  if (await canPrompt(COOLDOWN_BOOKING_DAYS)) await prompt();
}
