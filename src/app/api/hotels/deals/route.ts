import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels } from '@/lib/liteapi';

export const runtime = 'edge';

/* ═══════════════════════════════════════════════════════════════════════════
   HOT DESTINATIONS — curated list of top UK-holiday spots
   ═══════════════════════════════════════════════════════════════════════════ */

const ALL_DESTINATIONS: { city: string; country: string; flag: string; photo: string; tag?: string }[] = [
  // Set A
  { city: 'Marrakech',  country: 'MA', flag: '🇲🇦', photo: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Trending' },
  { city: 'Antalya',    country: 'TR', flag: '🇹🇷', photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'All Inclusive' },
  { city: 'Tenerife',   country: 'ES', flag: '🇪🇸', photo: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Family Fav' },
  { city: 'Palma',      country: 'ES', flag: '🇪🇸', photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Crete',      country: 'GR', flag: '🇬🇷', photo: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Faro',       country: 'PT', flag: '🇵🇹', photo: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Budget Gem' },
  { city: 'Cancun',     country: 'MX', flag: '🇲🇽', photo: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Lanzarote',  country: 'ES', flag: '🇪🇸', photo: 'https://images.unsplash.com/photo-1572099606223-6e29045d7de3?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Barcelona',  country: 'ES', flag: '🇪🇸', photo: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  { city: 'Paris',      country: 'FR', flag: '🇫🇷', photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  // Set B
  { city: 'Rome',       country: 'IT', flag: '🇮🇹', photo: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  { city: 'Istanbul',   country: 'TR', flag: '🇹🇷', photo: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Culture' },
  { city: 'Bangkok',    country: 'TH', flag: '🇹🇭', photo: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Bali',       country: 'ID', flag: '🇮🇩', photo: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Paradise' },
  { city: 'Rhodes',     country: 'GR', flag: '🇬🇷', photo: 'https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Family Fav' },
  { city: 'Dalaman',    country: 'TR', flag: '🇹🇷', photo: 'https://images.unsplash.com/photo-1623254756356-e498c7fc0a91?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Paphos',     country: 'CY', flag: '🇨🇾', photo: 'https://images.unsplash.com/photo-1558023728-1c1e8d40a140?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Hurghada',   country: 'EG', flag: '🇪🇬', photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Budget Gem' },
  { city: 'Corfu',      country: 'GR', flag: '🇬🇷', photo: 'https://images.unsplash.com/photo-1600430188203-bbb8dbb65a48?w=480&h=320&fit=crop&fm=webp&q=75' },
  { city: 'Lisbon',     country: 'PT', flag: '🇵🇹', photo: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  // Set C
  { city: 'Dubai',      country: 'AE', flag: '🇦🇪', photo: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Luxury' },
  { city: 'Amsterdam',  country: 'NL', flag: '🇳🇱', photo: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  { city: 'Athens',     country: 'GR', flag: '🇬🇷', photo: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Culture' },
  { city: 'Prague',     country: 'CZ', flag: '🇨🇿', photo: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'City Break' },
  { city: 'Bodrum',     country: 'TR', flag: '🇹🇷', photo: 'https://images.unsplash.com/photo-1601561999077-20d511d06aca?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Beach' },
  { city: 'Phuket',     country: 'TH', flag: '🇹🇭', photo: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Paradise' },
  { city: 'Santorini',  country: 'GR', flag: '🇬🇷', photo: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Romantic' },
  { city: 'Budapest',   country: 'HU', flag: '🇭🇺', photo: 'https://images.unsplash.com/photo-1549213783-8284d0336c4f?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Budget Gem' },
  { city: 'Maldives',   country: 'MV', flag: '🇲🇻', photo: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Luxury' },
  { city: 'Nice',       country: 'FR', flag: '🇫🇷', photo: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=480&h=320&fit=crop&fm=webp&q=75', tag: 'Riviera' },
];

/* Pick 10 destinations on a 2-day rotation so the section feels fresh */
function getRotatedDestinations() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const cycle = Math.floor(dayOfYear / 2); // changes every 2 days
  const total = ALL_DESTINATIONS.length;
  const size = 10;
  const start = (cycle * size) % total;
  const picked: typeof ALL_DESTINATIONS = [];
  for (let i = 0; i < size; i++) {
    picked.push(ALL_DESTINATIONS[(start + i) % total]);
  }
  return picked;
}

const KV_TTL = 21600; // 6 hours

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/hotels/deals — returns cached hot deals
   ═══════════════════════════════════════════════════════════════════════════ */

export type DealHotel = {
  id: string;
  offerId: string | null;
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  thumbnail: string | null;
  boardType: string | null;
  refundable: boolean;
  district: string | null;
};

export type DealDestination = {
  city: string;
  country: string;
  flag: string;
  photo: string;
  tag?: string;
  cheapestPrice: number | null;
  topHotel: DealHotel | null;
  budgetHotel: DealHotel | null;
  premiumHotel: DealHotel | null;
  hotelCount: number;
  checkin: string;
  checkout: string;
};

export async function GET() {
  const HOT_DESTINATIONS = getRotatedDestinations();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const cycle = Math.floor(dayOfYear / 2);
  const KV_KEY = `hotel_deals:v5:cycle${cycle}`;

  try {
    // Check cache first
    const cached = await kv.get<DealDestination[]>(KV_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json({ deals: cached, cached: true });
    }
  } catch { /* KV miss, fetch fresh */ }

  // Build search dates: next Friday → next Tuesday (4 nights, common UK booking)
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const checkinDate = new Date(now);
  checkinDate.setDate(now.getDate() + daysUntilFriday + 7); // next-next Friday
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkinDate.getDate() + 4);

  const checkin = checkinDate.toISOString().split('T')[0];
  const checkout = checkoutDate.toISOString().split('T')[0];

  const deals: DealDestination[] = [];

  // Fetch in batches of 5 to avoid overwhelming LiteAPI
  for (let i = 0; i < HOT_DESTINATIONS.length; i += 5) {
    const batch = HOT_DESTINATIONS.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (dest) => {
        try {
          const hotels = await liteapiGetHotels({
            cityName: dest.city,
            countryCode: dest.country,
            checkIn: checkin,
            checkOut: checkout,
            occupancy: [{ adults: 2 }],
            currency: 'GBP',
            guestNationality: 'GB',
            limit: 15,
          });

          if (!hotels || hotels.length === 0) {
            return {
              ...dest,
              cheapestPrice: null,
              topHotel: null,
              budgetHotel: null,
              premiumHotel: null,
              hotelCount: 0,
              checkin,
              checkout,
            };
          }

          // Only include bookable hotels (with offerId for Book Direct)
          const bookable = hotels.filter((h) => h.offerId);
          if (bookable.length === 0) {
            return {
              ...dest,
              cheapestPrice: null,
              topHotel: null,
              budgetHotel: null,
              premiumHotel: null,
              hotelCount: 0,
              checkin,
              checkout,
            };
          }

          // Sort by price
          const sorted = [...bookable].sort((a, b) => a.price - b.price);

          const mapHotel = (h: typeof sorted[0]): DealHotel => ({
            id: h.hotelId,
            offerId: h.offerId || null,
            name: h.hotelName,
            stars: h.stars || 0,
            pricePerNight: Math.round(h.pricePerNight || h.price / 4),
            totalPrice: Math.round(h.price),
            thumbnail: h.thumbnail || null,
            boardType: h.boardType || null,
            refundable: h.refundable,
            district: h.city || null,
          });

          // Budget = cheapest
          const budgetHotel = sorted[0];
          // Premium = highest star rating, or most expensive if equal
          const premiumHotel = [...sorted].sort((a, b) => (b.stars || 0) - (a.stars || 0) || b.price - a.price)[0];
          // Top rated = best value (high stars, low price)
          const topHotel = [...sorted].sort((a, b) => {
            const scoreA = (a.stars || 3) / (a.price || 1);
            const scoreB = (b.stars || 3) / (b.price || 1);
            return scoreB - scoreA;
          })[0];

          // Use real hotel photo from LiteAPI if available
          const realPhoto = topHotel.thumbnail || premiumHotel.thumbnail || budgetHotel.thumbnail || null;

          return {
            ...dest,
            photo: realPhoto || dest.photo, // prefer real hotel photo over Unsplash
            cheapestPrice: Math.round(budgetHotel.pricePerNight || budgetHotel.price / 4),
            topHotel: mapHotel(topHotel),
            budgetHotel: mapHotel(budgetHotel),
            premiumHotel: premiumHotel !== budgetHotel ? mapHotel(premiumHotel) : null,
            hotelCount: bookable.length,
            checkin,
            checkout,
          };
        } catch {
          return {
            ...dest,
            cheapestPrice: null,
            topHotel: null,
            budgetHotel: null,
            premiumHotel: null,
            hotelCount: 0,
            checkin,
            checkout,
          };
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') deals.push(r.value as DealDestination);
    }
  }

  // Cache results
  try {
    if (deals.length > 0) {
      await kv.set(KV_KEY, deals, { ex: KV_TTL });
    }
  } catch { /* cache write failure is ok */ }

  return NextResponse.json({ deals, cached: false });
}
