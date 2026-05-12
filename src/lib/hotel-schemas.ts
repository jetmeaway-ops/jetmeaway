/**
 * Zod schemas for the three hotel API edges.
 *
 * Goal: reject malformed input at the Edge before it reaches LiteAPI / DOTW
 * / Stripe / KV. Each route imports the relevant schema and runs `safeParse`
 * (NOT `parse`) so we control the error response shape.
 */
import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

/** Search params for GET /api/hotels — all values arrive as strings. */
export const HotelSearchSchema = z
  .object({
    city: z.string().min(1).max(80),
    checkin: isoDate,
    checkout: isoDate,
    adults: z.string().regex(/^\d+$/).optional(),
    children: z.string().regex(/^\d+$/).optional(),
    childrenAges: z.string().max(80).optional(),
    rooms: z.string().regex(/^\d+$/).optional(),
    stars: z.string().regex(/^\d+$/).optional(),
    placeId: z.string().max(120).optional(),
    // Optional WGS84 lat/lng forwarded from the autocomplete pick. When
    // present we use these as the geo-filter centroid instead of looking
    // up CITY_COORDS — this lets small UK towns work without a manual
    // entry in the coords table (Coulsdon, Hove, etc).
    lat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
    lng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
    // Explicit search radius in km. When set (with lat+lng), overrides the
    // backend default of 15 km. Curated LANDMARK_ALIASES entries pass this
    // — e.g. Disneyland Paris uses 10 km, Mount Everest uses 150 km. The
    // value is clamped server-side to 5-200 km to avoid pathological calls.
    radius: z.string().regex(/^\d+$/).optional(),
    // Signals that placeId came from a curated LANDMARK_ALIASES click (not
    // a generic Google Place picker borough). When set, /api/hotels passes
    // placeId straight to LiteAPI's destinationId path so they resolve via
    // their own area-cluster index (which catches Marne-la-Vallée hotels
    // for Disneyland Paris, Coupvray for the village edge of the park,
    // etc.) instead of the lat/lng-near-Paris-cluster path. Borough Place
    // IDs (Croydon, Wembley) deliberately don't set this flag so the
    // 2026-04-27 fix that skips placeId for boroughs stays intact.
    searchType: z.enum(['landmark', '']).optional(),
    // Per-room occupancy (new shape, takes precedence over flat
    // adults/children/rooms when both are supplied):
    //   occ=2-6/1-8/1-15
    //     • slash-separated per room
    //     • dash-separated within: adults, then each child's age
    // Decoder lives in @/lib/occupancy.
    occ: z.string().max(120).regex(/^[\d\-/]+$/).optional(),
    mode: z.enum(['datestrip', 'deal', '']).optional(),
    basePrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  })
  .refine((v) => v.checkout > v.checkin, {
    message: 'checkout must be after checkin',
    path: ['checkout'],
  });

export type HotelSearchInput = z.infer<typeof HotelSearchSchema>;

/** POST /api/hotels/prebook body. */
export const PrebookSchema = z.object({
  ref: z.string().min(8).max(80),
});

/** POST /api/hotels/book body — supplier-agnostic; LiteAPI path also wants
 *  prebookId + transactionId, DOTW path doesn't. We accept both shapes and
 *  let the route decide which fields it needs. */
export const BookSchema = z.object({
  ref: z.string().min(8).max(80),
  prebookId: z.string().min(1).max(200).optional(),
  transactionId: z.string().min(1).max(200).optional(),
});

/** Helper: pull a flat error message out of a ZodError for our JSON response. */
export function zodErrorToMessage(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
    .join('; ');
}
