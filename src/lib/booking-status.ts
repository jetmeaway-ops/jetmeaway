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
 * KV idempotency key for a one-shot reminder. Once we send a reminder of a
 * given kind for a given booking ref, we set this key so we never send the
 * same reminder twice (even if the cron retries or runs more than once a day).
 */
export function reminderSentKey(ref: string, kind: 'check-in-24h' | 'post-stay'): string {
  return `scout-reminder:${kind}:${ref}`;
}
