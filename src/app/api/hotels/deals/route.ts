import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels, type HotelOffer } from '@/lib/liteapi';
import { ghostedAmong } from '@/lib/ghost';

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

/* ═══════════════════════════════════════════════════════════════════════════
   TWO CACHES, BECAUSE A DEAL CARD IS TWO THINGS WITH DIFFERENT SHELF LIVES
   ───────────────────────────────────────────────────────────────────────────
   Until 2026-08-28 the whole card — hotel, price AND offerId — was cached for
   six hours in one blob. A LiteAPI offerId only lives ~15-30 minutes (the same
   window /api/hotels/prebook documents when it maps LiteAPI code 2001 to "this
   rate just sold out or expired"), so for the last five and a half of those six
   hours the strip was handing out Book buttons backed by expired offers, and
   the longer an entry sat the more of them were dead.

   An ageing offerId does not get cheaper or dearer — prebook returns the rate
   the offer was issued at, so the drift guard in /api/hotels/prebook never
   fires on one. It simply DIES, and the card goes on advertising a price that
   no longer exists anywhere. Measured on prod 2026-08-28 against one payload
   (built 01:00, stay 11-15 Sep, 2 adults), prebooking all 27 deal slots at
   several ages, each paired with a re-quote-then-prebook run in the SAME
   minutes so supplier weather could not explain the gap:
     cached offerIds, age 43 min → 23 of 27 held   re-quoted → 24 of 27
     cached offerIds, age 55 min → 23 of 27 held   (each at exactly its card price)
     cached offerIds, age 1h50m  → 21 of 27 held   re-quoted → 27 of 27
   and the coverage audit, on an entry left to age further still, found 8 of 27
   failing and then 13 of 27 an hour after that. The two clearest single cases:
   Faro "Hotel Monaco" — cached offer dead, fresh offer took a hold at the
   IDENTICAL £449.50; and Lanzarote "Dreams Lanzarote Playa Dorada" — cached
   offer dead at £766.71, fresh offer held at £757.73. Neither hotel was sold
   out. Both cards were selling a rate that had stopped existing.

   So the card is split down the middle:
     • SHELL  (6h)  — WHICH hotels we picked and what they look like: id, name,
                      stars, thumbnail, district, photo. None of it moves in
                      six hours, and re-deriving it is the expensive half
                      (10 × /data/hotels directory lookup + a 15-hotel pricing
                      wave = 12.1s measured cold on prod).
     • QUOTES (10m) — the perishable half: offerId, price, board, refundable,
                      property tax, cancellation deadline. Refreshing it is ONE
                      LiteAPI /hotels/rates call for the ~21 hotel ids the shell
                      already named — 4.8s measured, no directory lookup at all.

   Price and offerId are refreshed TOGETHER and never separately. An old price
   with a fresh offerId is a different lie: /api/hotels/prebook rejects >5% or
   >£5 drift between the card and the supplier re-quote, and the customer would
   meet "the price has changed" instead of "sold out". Same wall, different
   sign. So the two live in one record with one TTL.
   ═══════════════════════════════════════════════════════════════════════════ */

/** 6h. Which hotels the strip shows. The cost this cache exists to avoid. */
const SHELL_TTL = 21600;

/** 10 minutes. Deliberately inside the LOWER bound of LiteAPI's ~15-30 minute
 *  offer life, not at it: a served offer can already be 10 minutes old, and the
 *  customer then spends a minute or two on the checkout page before prebook is
 *  called. At a 15-minute TTL that click lands on the far side of the guarantee.
 *
 *  Cost of choosing 10 minutes over 6 hours, measured rather than assumed. A
 *  refresh is ONE getHotels() call, which the lib splits into 3 parallel
 *  /hotels/rates chunks for this cycle's 21 hotel ids: 4.8s wall clock, zero
 *  /data/hotels lookups. It fires lazily — only when a visitor arrives after
 *  the quote expired — so the CEILING is 144 refreshes/day = ~432 rates calls,
 *  plus the 4 shell builds/day (10 directory lookups + ~20 rate chunks each =
 *  ~120 calls) that were the whole bill before. ~550 calls/day against ~120:
 *  4.6× on an endpoint LiteAPI does not charge per search for, with the
 *  expensive directory half untouched, and real traffic nowhere near the
 *  ceiling because an hour with no visitors costs nothing.
 *
 *  Dropping the single 6h TTL to 10 minutes instead would have cost the FULL
 *  12.1s cold build 144 times a day — ~4,300 calls including 1,440 directory
 *  lookups. That is the option this design exists to avoid. */
const QUOTE_TTL = 600;

/** A destination whose chosen hotels have all stopped pricing gets rebuilt from
 *  a full city search, so the strip heals instead of slowly emptying over the
 *  shell's six hours — but at most this many per request. A rebuild is the
 *  expensive path (directory lookup + pricing wave; ten of them ran in 12.1s as
 *  two parallel batches of five), and letting every lost destination rebuild at
 *  once would put that cold-build latency back on a request that was supposed
 *  to cost 4.8s. Two is one small parallel batch. */
const MAX_REBUILDS_PER_REQUEST = 2;

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
  /** Taxes the guest pays AT THE PROPERTY (LiteAPI `included: false`). Null
   *  when the rate has none. Deal cards used to drop this field entirely, so a
   *  Santorini deal charged £720.11 and never mentioned the £153.31 due at the
   *  desk — 21% more — while the same hotel booked through search DID disclose
   *  it. Two paths to the same room must not tell different truths. */
  localFees: number | null;
  /** When free cancellation expires, for a deal flagged `refundable`. Without
   *  it the booking record stores null and our own cancel route answers "this
   *  rate is non-refundable" to a customer who is owed a refund — the exact
   *  harm fixed on the rate-row path in PR#160, still live on this path
   *  because a deal never carried the field to send. Null when the rate has no
   *  deadline. */
  cancellationDeadline: string | null;
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

/** The half of a deal card that does not perish: which hotel, and what it looks
 *  like. Deliberately carries no price and no offerId — anything with a shelf
 *  life shorter than six hours belongs in DealQuote, or it will be served
 *  stale. */
type ShellHotel = {
  id: string;
  name: string;
  stars: number;
  thumbnail: string | null;
  district: string | null;
};

type ShellDestination = {
  city: string;
  country: string;
  flag: string;
  photo: string;
  tag?: string;
  hotelCount: number;
  top: ShellHotel | null;
  budget: ShellHotel | null;
  /** Null when the premium pick IS the budget pick — the old single-blob code
   *  suppressed the duplicate the same way, and the client relies on it. */
  premium: ShellHotel | null;
};

type DealShell = {
  builtAt: number;
  /** The stay this shell picked hotels for. Recomputed every request; when it
   *  has rolled forward (the deal window is "next-next Friday", so it moves) the
   *  shell is thrown away rather than re-quoted for dates it never priced. */
  checkin: string;
  checkout: string;
  destinations: ShellDestination[];
};

/** The perishable half: everything the supplier can change under us, keyed by
 *  hotel id so one flat re-quote refreshes every card at once. */
type DealQuote = {
  offerId: string;
  totalPrice: number;
  pricePerNight: number;
  boardType: string | null;
  refundable: boolean;
  localFees: number | null;
  cancellationDeadline: string | null;
};

type QuoteCache = { quotedAt: number; quotes: Record<string, DealQuote> };

/* Whole-pound rounding destroyed the pence, and checkout then compared the
   rounded card price against the supplier's exact re-quote and cried "the hotel
   has updated their rate" over a difference WE invented: £720 vs £720.11 with
   priceDifferencePercent 0, and Dubai £127 vs £126.83 rendered GREEN as if the
   hotel had discounted it. 3 of 3 deal cards tripped it. Keep 2dp so the
   advertised number is the number the supplier will actually quote back. */
const round2 = (n: number) => Math.round(n * 100) / 100;

const NIGHTS = 4; // the deal window is a fixed Friday→Tuesday stay

function toShellHotel(h: HotelOffer): ShellHotel {
  return {
    id: h.hotelId,
    name: h.hotelName,
    stars: h.stars || 0,
    thumbnail: h.thumbnail || null,
    district: h.city || null,
  };
}

function toQuote(h: HotelOffer): DealQuote {
  return {
    offerId: h.offerId,
    totalPrice: round2(h.price),
    pricePerNight: round2(h.pricePerNight || h.price / NIGHTS),
    boardType: h.boardType || null,
    refundable: h.refundable,
    localFees: h.excludedTaxes ?? null,
    cancellationDeadline: h.cancellationDeadline ?? null,
  };
}

/** An empty destination — kept in the payload rather than dropped so the shape
 *  the client filters on (`cheapestPrice !== null`) stays the one it has always
 *  filtered on. */
function emptyDestination(
  dest: ShellDestination | (typeof ALL_DESTINATIONS)[number],
  checkin: string,
  checkout: string,
): DealDestination {
  return {
    city: dest.city,
    country: dest.country,
    flag: dest.flag,
    photo: dest.photo,
    ...(dest.tag ? { tag: dest.tag } : {}),
    cheapestPrice: null,
    topHotel: null,
    budgetHotel: null,
    premiumHotel: null,
    hotelCount: 0,
    checkin,
    checkout,
  };
}

/**
 * Price a destination from scratch: directory lookup + pricing wave, then pick
 * the three roles. This is the expensive path — 12.1s for ten destinations,
 * measured on prod — and the only one that can CHOOSE hotels.
 */
async function buildDestination(
  dest: (typeof ALL_DESTINATIONS)[number],
  checkin: string,
  checkout: string,
): Promise<{ shell: ShellDestination; quotes: Record<string, DealQuote> } | null> {
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

  // Only include bookable hotels (with offerId for Book Direct) — and skip
  // any hotel currently flagged as ghost inventory: a Book button that leads
  // to "sold out" is worse than one fewer hotel on a fifteen-hotel strip.
  const withOffer = (hotels || []).filter((h) => h.offerId);
  const ghosts = await ghostedAmong(withOffer.map((h) => h.hotelId));
  const bookable = withOffer.filter((h) => !ghosts.has(h.hotelId));
  if (bookable.length === 0) return null;

  const sorted = [...bookable].sort((a, b) => a.price - b.price);

  // Budget = cheapest
  const budget = sorted[0];
  // Premium = highest star rating, or most expensive if equal
  const premium = [...sorted].sort((a, b) => (b.stars || 0) - (a.stars || 0) || b.price - a.price)[0];
  // Top rated = best value (high stars, low price)
  const top = [...sorted].sort((a, b) => {
    const scoreA = (a.stars || 3) / (a.price || 1);
    const scoreB = (b.stars || 3) / (b.price || 1);
    return scoreB - scoreA;
  })[0];

  const realPhoto = top.thumbnail || premium.thumbnail || budget.thumbnail || null;

  const quotes: Record<string, DealQuote> = {};
  for (const h of [top, budget, premium]) quotes[h.hotelId] = toQuote(h);

  return {
    shell: {
      city: dest.city,
      country: dest.country,
      flag: dest.flag,
      photo: realPhoto || dest.photo, // prefer real hotel photo over Unsplash
      ...(dest.tag ? { tag: dest.tag } : {}),
      hotelCount: bookable.length,
      top: toShellHotel(top),
      budget: toShellHotel(budget),
      premium: premium.hotelId === budget.hotelId ? null : toShellHotel(premium),
    },
    quotes,
  };
}

/**
 * Re-price hotels we have already chosen. The trailing comma forces getHotels
 * down its "caller supplied hotel ids" branch — no /data/hotels lookup, straight
 * to /hotels/rates — which is why refreshing every card on the strip costs 4.8s
 * against the 12.1s of choosing them.
 *
 * A hotel missing from the result is a hotel the supplier will not price for
 * these dates any more. It is left out of the map on purpose: no quote, no
 * offerId, no card. Inventing a price for it is what created the bug.
 */
async function requoteHotels(
  hotelIds: string[],
  checkin: string,
  checkout: string,
): Promise<Record<string, DealQuote>> {
  if (hotelIds.length === 0) return {};
  const offers = await liteapiGetHotels({
    destinationId: `${hotelIds.join(',')},`,
    checkIn: checkin,
    checkOut: checkout,
    occupancy: [{ adults: 2 }],
    currency: 'GBP',
    guestNationality: 'GB',
    limit: hotelIds.length,
  });
  const quotes: Record<string, DealQuote> = {};
  for (const h of offers || []) {
    if (h.offerId) quotes[h.hotelId] = toQuote(h);
  }
  return quotes;
}

/** Marry the durable half to the live half. A role with no live quote is
 *  rendered as absent rather than as a card the customer cannot book. */
function assemble(
  shell: ShellDestination,
  quotes: Record<string, DealQuote>,
  checkin: string,
  checkout: string,
  servedGhosts: Set<string>,
): DealDestination {
  const hydrate = (s: ShellHotel | null): DealHotel | null => {
    if (!s) return null;
    const q = quotes[s.id];
    if (!q) return null;
    return {
      id: s.id,
      offerId: q.offerId,
      name: s.name,
      stars: s.stars,
      pricePerNight: q.pricePerNight,
      totalPrice: q.totalPrice,
      thumbnail: s.thumbnail,
      boardType: q.boardType,
      refundable: q.refundable,
      district: s.district,
      localFees: q.localFees,
      cancellationDeadline: q.cancellationDeadline,
    };
  };

  // The strip renders ONLY budgetHotel, so losing the budget pick's live quote
  // used to blank the whole destination — even when top and premium were still
  // priced and bookable in the very same quote map. That is the one place this
  // change could hide real inventory rather than a dead offer. Fall back to the
  // cheapest offer that IS still live; "budget" means cheapest on show, and the
  // heal path will re-pick properly on its own schedule.
  const live = [shell.budget, shell.top, shell.premium]
    .map(hydrate)
    .filter((h): h is NonNullable<typeof h> => !!h)
    // A pick can be flagged ghost AFTER the shell chose it (a customer's
    // failed prebook mid-cycle). Serving it would hand out the exact dead
    // Book button the flag exists to prevent; the budget fallback below and
    // the heal path fill the gap.
    .filter((h) => !servedGhosts.has(h.id));
  if (!live.length) return emptyDestination(shell, checkin, checkout);
  const budgetPick = hydrate(shell.budget);
  const budgetHotel =
    (budgetPick && !servedGhosts.has(budgetPick.id) ? budgetPick : null) ??
    live.reduce((a, b) => (a.totalPrice <= b.totalPrice ? a : b));

  return {
    city: shell.city,
    country: shell.country,
    flag: shell.flag,
    photo: shell.photo,
    ...(shell.tag ? { tag: shell.tag } : {}),
    // Derived from the LIVE quote, never carried over from the build, so the
    // "from £X a night" headline and the offer behind the Book button are
    // always the same rate.
    cheapestPrice: Math.round(budgetHotel.pricePerNight),
    topHotel: (() => { const h = hydrate(shell.top); return h && !servedGhosts.has(h.id) ? h : null; })(),
    budgetHotel,
    premiumHotel: (() => { const h = hydrate(shell.premium); return h && !servedGhosts.has(h.id) ? h : null; })(),
    hotelCount: shell.hotelCount,
    checkin,
    checkout,
  };
}

export async function GET() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const cycle = Math.floor(dayOfYear / 2);

  // v6 — DealHotel gained `localFees` (tax payable at the property) and stopped
  // rounding prices to whole pounds (2026-08-27). Both are stored-value changes,
  // and the 6-hour TTL meant v5 entries kept serving deals with no tax field and
  // integer prices long after the fix shipped — the upgraded monkey caught
  // exactly that on the first run against prod.
  // v7 — DealHotel also carries cancellationDeadline now, without which a
  // refundable deal booking could not be cancelled at all.
  // v8 (2026-08-28) — the single 6-hour blob is split into a 6-hour SHELL and a
  // 10-minute QUOTE record, so a card can never advertise an offerId older than
  // the ~15-30 minutes LiteAPI honours one for. A v7 entry is exactly the thing
  // this change exists to stop serving — six hours of dead offerIds and prices
  // the supplier will not match — so the key changes rather than being reused.
  const KV_SHELL = `hotel_deals:v8:shell:cycle${cycle}`;
  const KV_QUOTES = `hotel_deals:v8:quotes:cycle${cycle}`;

  // Build search dates: next Friday → next Tuesday (4 nights, common UK booking)
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const checkinDate = new Date(now);
  checkinDate.setDate(now.getDate() + daysUntilFriday + 7); // next-next Friday
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkinDate.getDate() + NIGHTS);

  const checkin = checkinDate.toISOString().split('T')[0];
  const checkout = checkoutDate.toISOString().split('T')[0];

  const HOT_DESTINATIONS = getRotatedDestinations();

  /* ── 1. The durable half ─────────────────────────────────────────────── */
  let shell: DealShell | null = null;
  try {
    const stored = await kv.get<DealShell>(KV_SHELL);
    if (
      stored?.destinations?.length &&
      // The 6h intent is enforced here as well as by the KV TTL, because the
      // partial-rebuild write below re-sets the key and would otherwise let a
      // busy cycle keep one hotel selection alive indefinitely.
      Date.now() - stored.builtAt < SHELL_TTL * 1000 &&
      // A shell priced for a stay that has since rolled forward is useless: its
      // hotels were chosen for dates nobody is being offered any more.
      stored.checkin === checkin
    ) {
      shell = stored;
    }
  } catch { /* KV miss — build fresh */ }

  let quotes: Record<string, DealQuote> = {};
  let quoteAgeSeconds = 0;
  /** Whether these offers came out of KV. It is the one case where we must NOT
   *  write them back: re-stamping `quotedAt` would hand the SAME offerIds
   *  another full 10 minutes and quietly re-create the "offer outlives the
   *  supplier's guarantee" bug this change exists to remove. Kept as a flag
   *  rather than inferred from `quoteAgeSeconds > 0`, which rounds to 0 for a
   *  record read back within half a second of being written. */
  let quotesFromCache = false;
  let shellDirty = false;

  if (!shell) {
    // Cold build. Fetch in batches of 5 to avoid overwhelming LiteAPI.
    const destinations: ShellDestination[] = [];
    for (let i = 0; i < HOT_DESTINATIONS.length; i += 5) {
      const batch = HOT_DESTINATIONS.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map((d) => buildDestination(d, checkin, checkout)));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          destinations.push(r.value.shell);
          Object.assign(quotes, r.value.quotes);
        }
      }
    }
    if (destinations.length === 0) {
      // Nothing priced at all — almost certainly LiteAPI being unavailable.
      // Cache nothing, so the next visitor retries instead of inheriting an
      // empty strip for six hours.
      return NextResponse.json({
        deals: HOT_DESTINATIONS.map((d) => emptyDestination(d, checkin, checkout)),
        cached: false,
        // Every other exit reports this; the monkey and the coverage audit read
        // it as a number. Nothing was quoted here, which is age zero, not absent.
        quoteAgeSeconds: 0,
      });
    }
    shell = { builtAt: Date.now(), checkin, checkout, destinations };
    shellDirty = true;
  } else {
    /* ── 2. The perishable half ───────────────────────────────────────── */
    let fresh: QuoteCache | null = null;
    try {
      fresh = await kv.get<QuoteCache>(KV_QUOTES);
    } catch { /* KV miss — re-quote */ }

    if (fresh?.quotes && Object.keys(fresh.quotes).length > 0) {
      quotes = fresh.quotes;
      quotesFromCache = true;
      quoteAgeSeconds = Math.max(0, Math.round((Date.now() - fresh.quotedAt) / 1000));
    } else {
      const ids: string[] = [];
      for (const d of shell.destinations) {
        for (const s of [d.top, d.budget, d.premium]) {
          if (s && !ids.includes(s.id)) ids.push(s.id);
        }
      }
      try {
        quotes = await requoteHotels(ids, shell.checkin, shell.checkout);
      } catch (e) {
        // A failed re-quote means we have no live offers. Serving the previous
        // ones is precisely the bug — an expired offerId and a price the
        // supplier will not honour — so the strip goes quiet for this request
        // and the next visitor retries.
        console.warn('[hotels/deals] re-quote failed:', e instanceof Error ? e.message : 'unknown');
        quotes = {};
      }
    }
  }

  const activeShell = shell;

  /* ── 3. Heal destinations whose hotels have stopped pricing ──────────── */
  // Gated on two things:
  //  · `!quotesFromCache` — a destination missing from a CACHED quote map was
  //    already missing when that map was built, so re-searching it on every
  //    request inside the same 10-minute window cannot tell us anything new.
  //    This is what stops a genuinely unpriceable city from costing two city
  //    searches per page view.
  //  · a non-empty map — if the re-quote returned nothing at all the supplier
  //    is down, every destination looks dead, and rebuilding would be ten
  //    pointless city searches.
  if (!quotesFromCache && Object.keys(quotes).length > 0) {
    const lost = activeShell.destinations.filter((d) => !d.budget || !quotes[d.budget.id]);
    const toRebuild = lost.slice(0, MAX_REBUILDS_PER_REQUEST);
    if (toRebuild.length > 0) {
      const rebuilt = await Promise.allSettled(
        toRebuild.map((d) => {
          const seed = ALL_DESTINATIONS.find((x) => x.city === d.city && x.country === d.country);
          return seed
            ? buildDestination(seed, activeShell.checkin, activeShell.checkout)
            : Promise.resolve(null);
        }),
      );
      rebuilt.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const idx = activeShell.destinations.findIndex(
          (x) => x.city === toRebuild[i].city && x.country === toRebuild[i].country,
        );
        if (idx >= 0) activeShell.destinations[idx] = r.value.shell;
        Object.assign(quotes, r.value.quotes);
        shellDirty = true;
      });
    }
  }

  // One lookup across every pick the shell might serve. A hotel flagged as
  // ghost AFTER the shell chose it must not reach a Book button.
  const servedGhosts = await ghostedAmong(
    activeShell.destinations.flatMap((d) =>
      [d.budget, d.top, d.premium].filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.id),
    ),
  );

  const deals = activeShell.destinations.map((d) =>
    assemble(d, quotes, activeShell.checkin, activeShell.checkout, servedGhosts),
  );

  /* ── 4. Persist ──────────────────────────────────────────────────────── */
  try {
    if (shellDirty) {
      await kv.set(KV_SHELL, activeShell, { ex: SHELL_TTL });
    }
    // Never re-written when it came from KV: `quotedAt` is when the SUPPLIER
    // issued these offers, and a second stamp would extend their advertised
    // life past the point LiteAPI honours them.
    if (!quotesFromCache && Object.keys(quotes).length > 0) {
      await kv.set(KV_QUOTES, { quotedAt: Date.now(), quotes } satisfies QuoteCache, { ex: QUOTE_TTL });
    }
  } catch { /* cache write failure is ok */ }

  return NextResponse.json({
    deals,
    // True only when BOTH halves came from KV — a shell hit that had to re-quote
    // did real supplier work and should not report itself as a cache hit.
    cached: !shellDirty && quotesFromCache,
    // How old the offerIds behind these Book buttons are, in seconds. Exposed so
    // the monkey and the coverage audit can assert the thing that broke here
    // (freshness) instead of re-deriving it from prices.
    quoteAgeSeconds,
  });
}
