/**
 * Booking-boundary verification — Stage 4 of the Safety Net build.
 *
 * Compares supplier responses (LiteAPI prebook + book) against the original
 * PendingBooking captured at start-booking time. If anything load-bearing
 * has drifted (dates moved, occupancy mutated, price outside tolerance), we
 * surface a structured mismatch the route can reject + alert on.
 *
 * Why: LiteAPI's `/rates/prebook` uses an `offerId` token that, in theory,
 * pins price + dates + occupancy. In practice we've seen drift from FX
 * repricing, cancellation-policy refresh, and rare supplier-side edits.
 * This guard catches those before the customer's card is charged.
 */

export interface BoundarySnapshot {
  /** What the customer searched for (and we stored on PendingBooking). */
  expected: {
    adults: number;
    children: number;
    childAges?: number[];
    rooms?: number;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    currency: string;
  };
  /** What the supplier just returned. */
  actual: {
    checkIn?: string;
    checkOut?: string;
    totalPrice?: number;
    currency?: string;
  };
}

export interface BoundaryViolation {
  field: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

/** Tolerance for FX/rounding noise on subsequent supplier echoes (£). */
const PRICE_TOLERANCE_GBP = 5;

/**
 * Run the boundary check. Returns `[]` if everything lines up, or a list of
 * violations. The caller decides whether to reject hard (book step) or just
 * report-and-pass-through (prebook step, where the LiteAPI Payment SDK form
 * will show the new price before payment anyway).
 */
export function verifyBookingBoundary(s: BoundarySnapshot): BoundaryViolation[] {
  const v: BoundaryViolation[] = [];
  const { expected, actual } = s;

  if (actual.checkIn && expected.checkIn && actual.checkIn !== expected.checkIn) {
    v.push({
      field: 'checkIn',
      expected: expected.checkIn,
      actual: actual.checkIn,
      message: `Check-in date drifted: searched ${expected.checkIn}, supplier returned ${actual.checkIn}`,
    });
  }
  if (actual.checkOut && expected.checkOut && actual.checkOut !== expected.checkOut) {
    v.push({
      field: 'checkOut',
      expected: expected.checkOut,
      actual: actual.checkOut,
      message: `Check-out date drifted: searched ${expected.checkOut}, supplier returned ${actual.checkOut}`,
    });
  }
  if (
    typeof actual.totalPrice === 'number' &&
    typeof expected.totalPrice === 'number' &&
    expected.totalPrice > 0
  ) {
    const drift = Math.abs(actual.totalPrice - expected.totalPrice);
    if (drift > PRICE_TOLERANCE_GBP) {
      v.push({
        field: 'totalPrice',
        expected: expected.totalPrice,
        actual: actual.totalPrice,
        message: `Price drifted by £${drift.toFixed(2)} (tolerance £${PRICE_TOLERANCE_GBP})`,
      });
    }
  }
  if (actual.currency && expected.currency && actual.currency !== expected.currency) {
    v.push({
      field: 'currency',
      expected: expected.currency,
      actual: actual.currency,
      message: `Currency changed: ${expected.currency} → ${actual.currency}`,
    });
  }

  return v;
}

/**
 * Sanity-check the persisted occupancy on a PendingBooking. Catches the
 * "children dropped to 0 between search and book" class of regression that
 * the kids-display fix in ca7e173 was the visible symptom of.
 */
export function verifyOccupancyShape(record: {
  adults: number;
  children?: number;
  childAges?: number[];
  rooms?: number;
}): BoundaryViolation[] {
  const v: BoundaryViolation[] = [];
  if (!Number.isFinite(record.adults) || record.adults < 1) {
    v.push({
      field: 'adults',
      expected: '>=1',
      actual: record.adults,
      message: `Adults count is invalid (${record.adults})`,
    });
  }
  const children = record.children ?? 0;
  if (!Number.isFinite(children) || children < 0) {
    v.push({
      field: 'children',
      expected: '>=0',
      actual: children,
      message: `Children count is invalid (${children})`,
    });
  }
  if (children > 0) {
    const ages = record.childAges || [];
    if (ages.length !== children) {
      v.push({
        field: 'childAges',
        expected: `${children} ages`,
        actual: `${ages.length} ages`,
        message: `Child ages array (${ages.length}) does not match children count (${children}) — metadata dropped between search and booking`,
      });
    }
  }
  if (record.rooms !== undefined && (record.rooms < 1 || record.rooms > 9)) {
    v.push({
      field: 'rooms',
      expected: '1-9',
      actual: record.rooms,
      message: `Rooms count out of range (${record.rooms})`,
    });
  }
  return v;
}

/** Render a violations array as a single human-readable line for logs/alerts. */
export function violationsToMessage(violations: BoundaryViolation[]): string {
  if (violations.length === 0) return '';
  return violations.map((v) => `[${v.field}] ${v.message}`).join(' | ');
}
