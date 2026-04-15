/**
 * DOTW → unified HotelOffer adapter.
 *
 * Maps the XML-derived JS object produced by `src/lib/dotw.ts` into the
 * same `HotelOffer` shape LiteAPI returns, so the merge + de-dupe logic in
 * `src/app/api/hotels/route.ts` can treat both sources interchangeably.
 *
 * XML → JS mapping quirks to remember:
 * - Attributes are prefixed `@_` (fast-xml-parser convention).
 * - `isArray: ['hotel', 'room', 'rate', …]` in dotw.ts means list fields
 *   always arrive as arrays — we don't have to defend against "one object
 *   vs many".
 * - Prices in DOTW `searchhotels` responses are total-stay, not per-night.
 */
import type { HotelOffer } from '@/lib/liteapi';
import type { DotwSearchParams, DotwGetRoomsParams } from '@/lib/dotw';

type XmlObj = Record<string, unknown>;

function getPath(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as XmlObj)[k];
  }
  return cur;
}

function nightsBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function toString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

/**
 * Map a DOTW `searchhotels` response into HotelOffer[].
 *
 * The returned offers carry `source: 'dotw'` (extended via type assertion)
 * and a Giata ID in `hotelId` when present, so the route handler can build
 * a reliable cross-supplier de-dupe key.
 */
export function dotwSearchToHotelOffers(
  dotwResponse: Record<string, unknown>,
  params: DotwSearchParams,
): (HotelOffer & { giataId?: string | null; source: string })[] {
  const hotelsWrapper = getPath(
    dotwResponse,
    'customer',
    'request',
    'hotels',
  ) as unknown;

  // Depending on how fast-xml-parser inflates repeated wrappers we may get
  // either an array of `{hotel: [...]}` or a single `{hotel: [...]}` object.
  let hotelList: XmlObj[] = [];
  if (Array.isArray(hotelsWrapper)) {
    for (const item of hotelsWrapper) {
      const hotels = getPath(item, 'hotel');
      if (Array.isArray(hotels)) hotelList.push(...(hotels as XmlObj[]));
    }
  } else if (hotelsWrapper && typeof hotelsWrapper === 'object') {
    const hotels = getPath(hotelsWrapper, 'hotel');
    if (Array.isArray(hotels)) hotelList = hotels as XmlObj[];
  }

  const nights = nightsBetween(params.fromDate, params.toDate);
  const currency = params.currency || 'GBP';

  return hotelList.map((h): HotelOffer & { giataId?: string | null; source: string } => {
    const hotelId = toString(h['@_hotelid'] || h['hotelId']);
    const giataId = toString(h['@_giataId'] || h['giataId'], '') || null;
    const hotelName = toString(h['hotelName'] || h['name'], 'Hotel');
    const stars = toNumber(h['rating'], 0);
    const geo = h['geoLocation'] as XmlObj | undefined;
    const image = getPath(h, 'hotelImages', 'image');
    const thumbnail = Array.isArray(image) ? toString(image[0]) : toString(image) || null;

    const stayPrice = toNumber(h['minRate']);
    const perNight = Math.round((stayPrice / nights) * 100) / 100;

    return {
      offerId: `dotw:${hotelId}`,  // DOTW doesn't expose an offerId at search
      hotelId: `dotw_${hotelId}`,  // prefix matches our convention (rh_, etc.)
      hotelName,
      stars,
      thumbnail,
      latitude: geo ? toNumber(geo['latitude']) : null,
      longitude: geo ? toNumber(geo['longitude']) : null,
      boardType: null,
      refundable: false,  // DOTW searchhotels v4 doesn't include this; pulled in getrooms
      currency,
      price: stayPrice,
      pricePerNight: perNight,
      boardOptions: [],
      giataId,
      source: 'dotw',
    };
  });
}

export interface DotwRoomDetail {
  hotelId: string;
  giataId: string | null;
  hotelName: string;
  roomName: string;
  rateBasis: string;
  refundable: boolean;
  total: number;
  currency: string;
  allocationDetails: string;
  nights: number;
  pricePerNight: number;
}

/**
 * Pull the first (cheapest) room + its allocationDetails token out of a
 * `getrooms` response. Used by the book route to lock and confirm.
 */
export function dotwRoomsToDetail(
  dotwResponse: Record<string, unknown>,
  params: DotwGetRoomsParams,
): DotwRoomDetail | null {
  const hotel = getPath(dotwResponse, 'customer', 'request', 'hotel') as XmlObj | undefined;
  if (!hotel) return null;

  const rooms = getPath(hotel, 'rooms', 'room') as XmlObj[] | undefined;
  if (!rooms || rooms.length === 0) return null;

  const room = rooms[0];
  const total = toNumber(room['total']);
  const currency = toString(room['currency'], 'GBP');
  const nights = nightsBetween(params.fromDate, params.toDate);
  const allocationDetails = toString(room['allocationDetails']);

  if (!allocationDetails) return null;

  return {
    hotelId: toString(hotel['@_hotelid']),
    giataId: toString(hotel['@_giataId'], '') || null,
    hotelName: toString(hotel['hotelName']),
    roomName: toString(room['roomName']),
    rateBasis: toString(room['rateBasis']),
    refundable: toString(room['refundable']).toLowerCase() === 'yes',
    total,
    currency,
    allocationDetails,
    nights,
    pricePerNight: Math.round((total / nights) * 100) / 100,
  };
}

/** Pull the DOTW booking reference out of a `confirmbooking` response. */
export function dotwConfirmToBookingRef(
  dotwResponse: Record<string, unknown>,
): { bookingRef: string; status: string } | null {
  const req = getPath(dotwResponse, 'customer', 'request') as XmlObj | undefined;
  if (!req) return null;
  const successful = toString(req['successful']).toLowerCase();
  if (successful !== 'true') return null;
  const bookingRef = toString(req['bookingReference']);
  const status = toString(req['status'], 'confirmed');
  if (!bookingRef) return null;
  return { bookingRef, status };
}
