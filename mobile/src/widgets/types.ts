/**
 * Shared types between the React Native app, the Swift Widget Extension,
 * and the Live Activity target. These mirror the Codable structs in
 * `mobile/ios/Shared/AppGroup.swift` (added by the owner during Phase 8
 * Swift target setup) so JSON written from RN deserialises 1:1 in Swift.
 *
 * IMPORTANT: keep field names + types in lock-step with the Swift side.
 * Any rename here is a breaking change for the widget timeline.
 */

export type WidgetTripSnapshot = {
  /** Booking ID — JMA-... or supplier ref */
  id: string;
  /** Hotel name or first-segment route, e.g. "Hotel Cézanne" or "LON → BCN" */
  title: string;
  /** Sub-line, e.g. "Barcelona, Spain" or "British Airways · 2h 5m" */
  subtitle: string;
  /** Provider for icon selection: "duffel" | "liteapi" | "webbeds" | "unknown" */
  provider: string;
  /** ISO timestamp of the trip start (departure or check-in) */
  startsAt: string;
  /** Days until trip start; pre-computed so the widget doesn't have to.
   * Negative if the trip already started.
   */
  daysUntil: number;
  /** Optional thumbnail URL (small widget). Cached in shared container. */
  thumbnailUrl?: string;
};

export type WidgetState = {
  /** Up-to-3 upcoming trips, soonest first. Empty array if none. */
  upcoming: WidgetTripSnapshot[];
  /** Optional saved-search price-watch. Surfaces on medium widget. */
  priceWatch?: {
    label: string;        // "London → Barcelona"
    currentPrice: number; // in pence
    savedPrice: number;   // baseline at time of save
    deltaPercent: number; // (current - saved) / saved * 100
  };
  /** Last-write timestamp (ms epoch) for staleness checks. */
  updatedAt: number;
};

export const WIDGET_STATE_KEY = 'widget:state:v1';
