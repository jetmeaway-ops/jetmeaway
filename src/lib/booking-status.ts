/**
 * Booking-status helpers — gates Scout Communications.
 *
 * Scheduled comms (24-hour reminder, post-stay survey, anniversary deals)
 * MUST check `isBookingActive()` before sending, otherwise we hassle
 * customers about cancelled or completed bookings.
 *
 * The 'active' definition for reminders: confirmed/paid AND check-in is
 * still ahead of us OR the stay is currently underway. A booking that's
 * already been refunded, cancelled, or completed is NOT active and gets no
 * scheduled comms.
 */

import type { Booking } from './bookings';

/**
 * Active = the customer has a real, paid stay coming up (or in progress).
 * Returns false for cancelled / refunded / failed / completed bookings, AND
 * for bookings whose checkOut is in the past (defensive — completed status
 * sometimes lags the actual stay).
 *
 * `now` is parameterised for deterministic testing. Defaults to wall-clock.
 */
export function isBookingActive(booking: Booking, now: Date = new Date()): boolean {
  if (!booking) return false;

  // Status must be in the live range. Pending counts as active because
  // the customer thinks the booking is real and may want their reminder.
  // Owner can tighten this later if pending-but-not-paid noise becomes
  // a problem.
  const liveStatuses: Booking['status'][] = ['pending', 'confirmed'];
  if (!liveStatuses.includes(booking.status)) return false;

  // If we have a checkOut date, it must not be in the past.
  if (booking.checkOut) {
    const out = new Date(booking.checkOut);
    if (!isNaN(out.getTime()) && out.getTime() < now.getTime() - 12 * 3600_000) {
      // 12-hour grace period after checkOut to absorb timezone drift before
      // we treat the stay as definitively over.
      return false;
    }
  }

  return true;
}

/**
 * Returns true when the booking's check-in is exactly N days from now
 * (calendar-day comparison, not 24-hour windows — so a booking at any
 * time on `today + N` matches). Used by the reminder cron.
 *
 * `now` is parameterised for deterministic testing.
 */
export function checkInIsInDays(booking: Booking, days: number, now: Date = new Date()): boolean {
  if (!booking?.checkIn) return false;
  const ci = new Date(booking.checkIn);
  if (isNaN(ci.getTime())) return false;

  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(ci.getFullYear(), ci.getMonth(), ci.getDate());
  const diffDays = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diffDays === days;
}

/**
 * The scheduled messages a booking can receive. One member per distinct
 * message — NEVER reuse a member for a new message: the marker for
 * 'check-in-24h' is written on day D-1 with a 30-day TTL and is still alive
 * on day D, so a day-of send that reused it would be suppressed for 100% of
 * guests, silently, showing up only as `skippedAlreadySent` in the cron JSON.
 */
export type ReminderKind = 'check-in-24h' | 'check-in-day' | 'post-stay';

/** The delivery channels a reminder kind can go out on. 'sms' is retained so
 *  idempotency still holds the day SMS_TO_CUSTOMERS=1 turns customer SMS back
 *  on (see lib/twilio.ts). */
export type ReminderChannel = 'email' | 'push' | 'sms';

/**
 * KV idempotency key for a one-shot reminder. Once we send a reminder of a
 * given kind for a given booking ref, we set this key so we never send the
 * same reminder twice (even if the cron retries or runs more than once a day).
 *
 * `channel` scopes the key per delivery channel. Without it, one shared marker
 * means a push success masks an email failure (or the reverse) and the failed
 * channel never retries — the guest silently gets nothing on the channel that
 * mattered. Omitting `channel` returns the ORIGINAL combined key shape, which
 * still exists in production KV for every 24-hour reminder sent before
 * 2026-08-29; the reminder cron reads it as a legacy "this kind is already
 * done" gate so the new per-channel keys can never cause a double-send.
 */
export function reminderSentKey(
  ref: string,
  kind: ReminderKind,
  channel?: ReminderChannel,
): string {
  return channel
    ? `scout-reminder:${kind}:${channel}:${ref}`
    : `scout-reminder:${kind}:${ref}`;
}
