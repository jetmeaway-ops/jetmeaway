/**
 * DOTW mock fixtures — used when `DOTW_USERNAME` is unset.
 *
 * Lets us build and unit-test the adapter + booking flow BEFORE Anthony
 * Potts sends real test credentials (~14 days after contract signature on
 * 14 April 2026). The shapes here mirror the structure `fast-xml-parser`
 * produces from a real DOTW XML response, so adapter code written against
 * the mock will work unchanged against the live server.
 *
 * Keep the fixtures small and deterministic — they're for adapter unit
 * tests and smoke-tests, not realistic marketing copy.
 */
import type {
  DotwSearchParams,
  DotwGetRoomsParams,
  DotwConfirmBookingParams,
} from './dotw';

/** Canonical mock hotels per test city. City code = lowercase city name. */
const MOCK_HOTELS: Record<string, Array<{
  hotelId: string;
  name: string;
  stars: number;
  giataId: string;
  lat: number;
  lng: number;
  basePrice: number;  // GBP per-stay (not per-night — matches DOTW response shape)
  thumbnail: string;
}>> = {
  dubai: [
    { hotelId: 'DX-001', name: 'Atlantis The Palm', stars: 5, giataId: '108479',
      lat: 25.1308, lng: 55.1174, basePrice: 420,
      thumbnail: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c' },
    { hotelId: 'DX-002', name: 'Jumeirah Beach Hotel', stars: 5, giataId: '108461',
      lat: 25.1413, lng: 55.1855, basePrice: 360,
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },
    { hotelId: 'DX-003', name: 'Rove Downtown Dubai', stars: 3, giataId: '608821',
      lat: 25.1972, lng: 55.2744, basePrice: 95,
      thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791' },
  ],
  london: [
    { hotelId: 'LN-001', name: 'The Savoy', stars: 5, giataId: '37489',
      lat: 51.5101, lng: -0.1203, basePrice: 520,
      thumbnail: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa' },
    { hotelId: 'LN-002', name: 'Premier Inn Hub London', stars: 3, giataId: '612044',
      lat: 51.5142, lng: -0.1418, basePrice: 110,
      thumbnail: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c' },
  ],
  barcelona: [
    { hotelId: 'BCN-001', name: 'Hotel Arts Barcelona', stars: 5, giataId: '42017',
      lat: 41.3864, lng: 2.1963, basePrice: 295,
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },
    { hotelId: 'BCN-002', name: 'H10 Casanova', stars: 4, giataId: '200412',
      lat: 41.3843, lng: 2.1610, basePrice: 115,
      thumbnail: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e' },
  ],
};

function cityKeyFromParams(params: DotwSearchParams): string {
  // Adapter passes `cityCode` as the lowercased city name when feeding the
  // mock; live code uses DOTW internal numeric codes. Either way fall back
  // to dubai if we don't recognise it (DOTW's best test market).
  const c = (params.cityCode || '').toLowerCase();
  if (MOCK_HOTELS[c]) return c;
  return 'dubai';
}

function nightsBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  const n = Math.max(1, Math.round((b - a) / 86_400_000));
  return n;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  searchhotels fixture                                                  */
/* ────────────────────────────────────────────────────────────────────── */

export function mockSearchHotelsResponse(params: DotwSearchParams): Record<string, unknown> {
  const city = cityKeyFromParams(params);
  const hotels = MOCK_HOTELS[city];
  const nights = nightsBetween(params.fromDate, params.toDate);

  return {
    customer: {
      request: {
        '@_command': 'searchhotels',
        hotels: [{
          hotel: hotels.map((h) => ({
            '@_hotelid': h.hotelId,
            '@_giataId': h.giataId,
            hotelName: h.name,
            rating: h.stars,
            geoLocation: { latitude: h.lat, longitude: h.lng },
            hotelImages: { image: h.thumbnail },
            minRate: Math.round(h.basePrice * nights * 100) / 100,
            currency: params.currency || 'GBP',
            mealType: [{
              '@_id': 1,
              name: 'Room Only',
              minRate: Math.round(h.basePrice * nights * 100) / 100,
            }],
          })),
        }],
        totalHotels: hotels.length,
        successful: 'true',
      },
    },
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  getrooms fixture                                                      */
/* ────────────────────────────────────────────────────────────────────── */

export function mockGetRoomsResponse(params: DotwGetRoomsParams): Record<string, unknown> {
  const city = cityKeyFromParams(params);
  const hotel = MOCK_HOTELS[city].find((h) => h.hotelId === params.hotelId) ||
                MOCK_HOTELS[city][0];
  const nights = nightsBetween(params.fromDate, params.toDate);
  const total = Math.round(hotel.basePrice * nights * 100) / 100;

  // Blocking call returns a fresh allocationDetails each time — mirror that
  // so unit tests can verify we always feed the LATEST token to confirmbooking.
  const allocToken = params.block
    ? `ALLOC-BLOCK-${hotel.hotelId}-${Date.now()}`
    : `ALLOC-LOOK-${hotel.hotelId}`;

  return {
    customer: {
      request: {
        '@_command': 'getrooms',
        hotel: {
          '@_hotelid': hotel.hotelId,
          '@_giataId': hotel.giataId,
          hotelName: hotel.name,
          rooms: {
            room: [{
              '@_runno': 0,
              roomName: 'Deluxe Double Room',
              rateBasis: 'Bed & Breakfast',
              refundable: 'yes',
              cancellationRules: {
                rule: [{
                  fromDate: params.fromDate,
                  toDate: params.fromDate,
                  charge: 0,
                  currency: params.currency || 'GBP',
                  noShowPolicy: 'no',
                }],
              },
              total,
              currency: params.currency || 'GBP',
              allocationDetails: allocToken,
            }],
          },
        },
        successful: 'true',
      },
    },
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  confirmbooking fixture                                                */
/* ────────────────────────────────────────────────────────────────────── */

export function mockConfirmBookingResponse(
  params: DotwConfirmBookingParams,
): Record<string, unknown> {
  return {
    customer: {
      request: {
        '@_command': 'confirmbooking',
        successful: 'true',
        bookingReference: `DOTW-MOCK-${Date.now()}`,
        customerReference: params.customerReference,
        status: 'confirmed',
        leadGuest: {
          firstName: params.leadGuest.firstName,
          lastName: params.leadGuest.lastName,
          email: params.leadGuest.email,
        },
      },
    },
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  cancelbooking fixture                                                 */
/* ────────────────────────────────────────────────────────────────────── */

export function mockCancelBookingResponse(bookingRef: string): Record<string, unknown> {
  return {
    customer: {
      request: {
        '@_command': 'cancelbooking',
        successful: 'true',
        bookingReference: bookingRef,
        status: 'cancelled',
        cancellationCharge: 0,
      },
    },
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  getbookingdetails fixture                                             */
/* ────────────────────────────────────────────────────────────────────── */

export function mockGetBookingDetailsResponse(bookingRef: string): Record<string, unknown> {
  return {
    customer: {
      request: {
        '@_command': 'getbookingdetails',
        successful: 'true',
        bookingReference: bookingRef,
        status: 'confirmed',
      },
    },
  };
}
