'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';
import RoomsTable, { type RoomRate } from './RoomsTable';
import RoomsSkeleton from './RoomsSkeleton';
import RoomDetailModal from './RoomDetailModal';
import { chooseDefaultTab } from '@/lib/silentScout';
import { vibeTagsForSearchedCity } from '@/data/destinations';

// Leaflet touches `window` on import, so SSR must be disabled. ScoutSidebar
// renders its own Leaflet map when embedded on the detail page, replacing the
// stand-alone HotelMap in the Location section — one map, richer signal.
const ScoutSidebar = dynamic(() => import('@/components/ScoutSidebar'), { ssr: false });

interface RoomMeta {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  maxOccupancy: number | null;
  sizeSqm: number | null;
  beds: string | null;
}

interface HotelPolicy {
  kind: 'internet' | 'parking' | 'pets' | 'children' | 'groups' | 'other';
  name: string;
  description: string;
}

/** BACKLOG B2 (2026-04-21): one review pulled from LiteAPI /data/reviews. */
interface HotelReview {
  name: string;
  country: string | null;
  type: string | null;
  date: string | null;
  language: string | null;
  headline: string | null;
  pros: string | null;
  cons: string | null;
  score: number | null;
}

interface HotelReviews {
  averageScore: number | null;
  count: number;
  list: HotelReview[];
}

interface HotelDetails {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  stars: number | null;
  latitude: number | null;
  longitude: number | null;
  mainPhoto: string | null;
  photos: string[];
  amenities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  policies?: HotelPolicy[];
  rooms?: RoomMeta[];
  /** BACKLOG B2: aggregate score + most-recent reviews. Optional on the
   *  type because cached v3 entries (rare, expire in 24h) don't carry it. */
  reviews?: HotelReviews;
}

/* v2-plan step-4: kind → (icon, accent) for the Policies cards. Keeping
   icons quiet and champagne-accented so the section sits alongside the
   facilities grid without shouting. */
const POLICY_ICON: Record<HotelPolicy['kind'], string> = {
  internet: 'fa-wifi',
  parking: 'fa-square-parking',
  pets: 'fa-paw',
  children: 'fa-children',
  groups: 'fa-user-group',
  other: 'fa-circle-info',
};

interface SimilarHotel {
  id: number | string;
  name: string;
  stars: number;
  pricePerNight: number;
  district: string | null;
  bookable?: boolean;
  source?: string;
  thumbnail?: string | null;
  boardType?: string | null;
  refundable?: boolean;
  offerId?: string | null;
  totalPrice?: number;
  currency?: string;
}

const PERK_ICONS: Record<string, { icon: string; label: string }> = {
  free_breakfast: { icon: 'fa-mug-saucer', label: 'Free Breakfast' },
  free_wifi: { icon: 'fa-wifi', label: 'Free WiFi' },
  free_parking: { icon: 'fa-square-parking', label: 'Free Parking' },
  late_checkout: { icon: 'fa-clock', label: 'Late Checkout' },
  early_checkin: { icon: 'fa-clock-rotate-left', label: 'Early Check-in' },
  spa_access: { icon: 'fa-spa', label: 'Spa Access' },
  airport_transfer: { icon: 'fa-plane-arrival', label: 'Airport Transfer' },
  room_upgrade: { icon: 'fa-arrow-up', label: 'Room Upgrade' },
  free_cancellation: { icon: 'fa-circle-check', label: 'Free Cancellation' },
  all_inclusive: { icon: 'fa-utensils', label: 'All Inclusive' },
};

// Fallback: derive perks from boardType when perks array is empty
// Keys are normalised (lowercase, trimmed) — lookup via normBoard()
const BOARD_TO_PERKS: Record<string, string[]> = {
  'bb': ['free_breakfast'],
  'bed and breakfast': ['free_breakfast'],
  'bed & breakfast': ['free_breakfast'],
  'breakfast included': ['free_breakfast'],
  'hb': ['free_breakfast'],
  'half board': ['free_breakfast'],
  'fb': ['free_breakfast'],
  'full board': ['free_breakfast'],
  'ai': ['free_breakfast', 'all_inclusive'],
  'all inclusive': ['free_breakfast', 'all_inclusive'],
  'all-inclusive': ['free_breakfast', 'all_inclusive'],
};
const normBoard = (b: string) => b.trim().toLowerCase();

/* Phase-5: Hotel-facility icon resolver. LiteAPI returns facility names as
   free-form strings ("Free WiFi", "Outdoor swimming pool", "24-hour front
   desk"), so we map substrings → Font Awesome icons. Keep this list in
   priority order — the first match wins. Falls back to a generic check so
   unknown facilities still render neatly in the chip grid. */
const HOTEL_AMENITY_ICON_MAP: Array<[RegExp, string]> = [
  [/wi-?fi|internet/i, 'fa-wifi'],
  [/parking|garage/i, 'fa-square-parking'],
  [/pool|swim/i, 'fa-person-swimming'],
  [/gym|fitness/i, 'fa-dumbbell'],
  [/spa|sauna|jacuzzi|hot tub/i, 'fa-spa'],
  [/restaurant/i, 'fa-utensils'],
  [/bar|lounge/i, 'fa-martini-glass-citrus'],
  [/breakfast/i, 'fa-mug-hot'],
  [/airport|shuttle|transfer/i, 'fa-plane-arrival'],
  [/24[- ]?hour|front desk|reception/i, 'fa-bell-concierge'],
  [/air ?conditioning|climate/i, 'fa-snowflake'],
  [/heating/i, 'fa-temperature-high'],
  [/non[- ]?smoking/i, 'fa-ban-smoking'],
  [/pet|dog|animal/i, 'fa-paw'],
  [/family|child|kid/i, 'fa-children'],
  [/laundry|dry clean/i, 'fa-shirt'],
  [/elevator|lift/i, 'fa-elevator'],
  [/luggage|baggage|storage/i, 'fa-suitcase-rolling'],
  [/terrace|garden|patio/i, 'fa-tree'],
  [/safe|locker/i, 'fa-lock'],
  [/tv|television/i, 'fa-tv'],
  [/business|meeting|conference/i, 'fa-briefcase'],
  [/wheelchair|accessib|disabled/i, 'fa-wheelchair'],
  [/concierge/i, 'fa-bell-concierge'],
  [/beach/i, 'fa-umbrella-beach'],
  [/ski/i, 'fa-person-skiing'],
  [/balcon/i, 'fa-chimney'],
];

function resolveAmenityIcon(name: string): string {
  for (const [re, icon] of HOTEL_AMENITY_ICON_MAP) {
    if (re.test(name)) return icon;
  }
  return 'fa-circle-check';
}

function Stars({ count }: { count: number | null }) {
  if (!count || count < 1) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: Math.min(5, Math.round(count)) }).map((_, i) => (
        <i key={i} className="fa-solid fa-star text-amber-400 text-[.8rem]" />
      ))}
    </span>
  );
}

/** BACKLOG B2: Booking-style verbal label for an aggregate review score. */
function scoreLabel(score: number): string {
  if (score >= 9) return 'Superb';
  if (score >= 8) return 'Very good';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Pleasant';
  if (score >= 4) return 'Mixed';
  return 'Limited feedback';
}

/** BACKLOG B2: "2025-11-03" → "Nov 2025". Degrades to raw string on bad input. */
function formatReviewDate(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const id = params?.id || '';

  const [hotel, setHotel] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  // Google Places enrichment — extra photos, Google reviews, Google's editorial
  // blurb, phone, website, opening hours, Google Maps link. Loaded after the
  // primary hotel details so the page can render without waiting on it.
  type GoogleInfo = {
    placeId: string | null;
    rating: number | null;
    ratingCount: number | null;
    photos: string[];
    reviews: Array<{ authorName: string; authorPhoto: string | null; rating: number; text: string; relativeTime: string }>;
    editorialSummary: string | null;
    websiteUri: string | null;
    phone: string | null;
    priceLevel: string | null;
    formattedAddress: string | null;
    googleMapsUri: string | null;
    openingHours: string[] | null;
  };
  const [googleInfo, setGoogleInfo] = useState<GoogleInfo | null>(null);
  const [startingBooking, setStartingBooking] = useState(false);
  const [similarHotels, setSimilarHotels] = useState<SimilarHotel[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Rates table (Scout RoomsTable) state —
  //   rates: all board/rate options for this hotel (from /api/hotels/rates)
  //   selectedRate: the row the user has clicked (drives the sidebar "breathe")
  //   ratesLoading: suppress empty-state flash while the fetch is in flight
  const [rates, setRates] = useState<RoomRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [selectedRate, setSelectedRate] = useState<RoomRate | null>(null);
  const [sidebarBreathe, setSidebarBreathe] = useState(false);

  // ── Back-to-top button ──
  // The detail page is long (rooms → description → facilities → policies →
  // reviews → similar hotels). Once the user has tapped a section link in
  // the sticky nav they're deep in the page and need a one-tap escape hatch
  // back to the hero. Fade in after ~600px of scroll — below that the page
  // header is still in view and the button is redundant.
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Phase-4: Room detail modal state. We track the offerId (not the rate
  // object) so the modal always reflects the latest row data if the rates
  // array updates under it.
  const [modalOfferId, setModalOfferId] = useState<string | null>(null);

  // Search context passed from /hotels results (for the Book button)
  const offerId = sp?.get('offerId') || '';
  const checkin = sp?.get('checkin') || '';
  const checkout = sp?.get('checkout') || '';
  const adults = sp?.get('adults') || '2';
  const children = sp?.get('children') || '0';
  const childrenAges = sp?.get('childrenAges') || '';
  const rooms = sp?.get('rooms') || '1';
  const price = sp?.get('price') || '';
  const currency = sp?.get('currency') || 'GBP';
  const city = sp?.get('city') || '';
  const refundableParam = sp?.get('refundable');
  const refundable = refundableParam === '1' ? true : refundableParam === '0' ? false : null;
  const boardType = sp?.get('board') || '';
  const negPrice = sp?.get('negPrice') ? parseFloat(sp.get('negPrice')!) : null;
  const mktPrice = sp?.get('mktPrice') ? parseFloat(sp.get('mktPrice')!) : null;
  const rawPerks = sp?.get('perks') ? sp.get('perks')!.split(',') : [];
  // Fallback: if perks empty, derive from boardType
  const perks = rawPerks.length > 0 ? rawPerks : (BOARD_TO_PERKS[normBoard(boardType)] || []);
  const signalType = sp?.get('signal') || '';
  const localFees = sp?.get('localFees') ? parseFloat(sp.get('localFees')!) : null;

  useEffect(() => {
    let cancelled = false;
    // Curated hotel IDs are numeric (1-200); the details endpoint can only
    // resolve LiteAPI IDs (alphanumeric like `lp6558ae6f`) and DOTW/RH rows
    // are quarantined. Don't bother fetching for a curated row — bounce back
    // to the search page so the user lands on something useful instead of
    // a dead-end "Hotel not found" message. Preserves their original search
    // context so the page restores their dates/guests.
    if (/^\d+$/.test(String(id))) {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (checkin) params.set('checkin', checkin);
      if (checkout) params.set('checkout', checkout);
      if (adults) params.set('adults', adults);
      if (children) params.set('children', children);
      if (rooms) params.set('rooms', rooms);
      window.location.replace(`/hotels${params.toString() ? '?' + params.toString() : ''}`);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/hotels/details/${encodeURIComponent(id)}`, { cache: 'force-cache' });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) setError(data.error || 'Hotel not found');
        else setHotel(data.hotel);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, city, checkin, checkout, adults, children, rooms]);

  // Google Places enrichment — runs once we have the hotel name + coords from
  // the primary details fetch. Server-side route KV-caches per hotelId for
  // 24h so repeat visits don't burn quota. Failures are silent — Google data
  // is purely additive, not load-bearing for the page.
  useEffect(() => {
    if (!hotel?.name) return;
    let cancelled = false;
    const params = new URLSearchParams({ hotelId: hotel.id, name: hotel.name });
    if (typeof hotel.latitude === 'number') params.set('lat', String(hotel.latitude));
    if (typeof hotel.longitude === 'number') params.set('lng', String(hotel.longitude));
    fetch(`/api/hotels/google-info?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.data) setGoogleInfo(d.data as GoogleInfo);
      })
      .catch(() => { /* silent — purely additive */ });
    return () => { cancelled = true; };
  }, [hotel?.id, hotel?.name, hotel?.latitude, hotel?.longitude]);

  // Fetch similar hotels in the same city
  useEffect(() => {
    if (!city || !checkin || !checkout) return;
    setSimilarLoading(true);
    const params = new URLSearchParams({
      city,
      checkin,
      checkout,
      adults,
      children,
      rooms,
      stars: '0',
    });
    if (childrenAges) params.set('childrenAges', childrenAges);
    fetch(`/api/hotels?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.hotels) {
          // Filter out the current hotel and take up to 6
          const others = (data.hotels as SimilarHotel[])
            .filter(h => String(h.id) !== id && String(h.id) !== `la_${id}` && `la_${String(h.id)}` !== id)
            .slice(0, 6);
          setSimilarHotels(others);
        }
        setSimilarLoading(false);
      })
      .catch(() => setSimilarLoading(false));
  }, [city, checkin, checkout, adults, children, rooms, id]);

  /* Fetch the full rate table for this hotel. We pass the exact same
     search-context params as the results page used so the prices here
     match cent-for-cent with what the user clicked on. */
  useEffect(() => {
    if (!id || !checkin || !checkout) { setRatesLoading(false); return; }
    let cancelled = false;
    (async () => {
      setRatesLoading(true);
      try {
        const p = new URLSearchParams({
          hotelId: id,
          checkin,
          checkout,
          adults,
          children,
          rooms,
          currency,
        });
        if (childrenAges) p.set('childrenAges', childrenAges);
        const res = await fetch(`/api/hotels/rates?${p.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.offers)) {
          const list: RoomRate[] = data.offers;
          setRates(list);
          // Pre-select whichever row matches the offerId the user clicked
          // on the search results page — landing state already reflects
          // the card they came from.
          const pre = list.find((r) => r.offerId === offerId) || list[0] || null;
          setSelectedRate(pre);
        } else {
          setRates([]);
        }
      } catch {
        if (!cancelled) setRates([]);
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, checkin, checkout, adults, children, rooms, currency, childrenAges, offerId]);

  /* Row click — updates the selected rate and triggers the sidebar
     "breathe" (1.00 → 1.02 → 1.00 over 180ms ease-out). `will-change-
     transform` on the container keeps the GPU hot so the transform is
     buttery, not jagged. */
  const handleRowSelect = (nextOfferId: string) => {
    const next = rates.find((r) => r.offerId === nextOfferId);
    if (!next) return;
    setSelectedRate(next);
    setSidebarBreathe(true);
    window.setTimeout(() => setSidebarBreathe(false), 260);
  };

  /* Phase-4: memoised lookup from lowercased room name → room metadata.
     MUST live here (before any early return) because React's Rules of
     Hooks require every hook to be called on every render — moving it
     below the `if (loading)` / `if (error)` returns breaks hook order
     the first time the page mounts without `hotel` yet loaded. */
  const roomMetaByName = useMemo(() => {
    const m = new Map<string, RoomMeta>();
    for (const r of hotel?.rooms || []) {
      const key = r.name.toLowerCase().trim();
      if (key) m.set(key, r);
    }
    return m;
  }, [hotel?.rooms]);

  /* Row Reserve click — delegate to the existing handleBook using the
     selected rate's offerId/price/board so the checkout sees the exact
     row the user clicked, not the URL-param offer. */
  const handleRowReserve = async (rowOfferId: string) => {
    const rate = rates.find((r) => r.offerId === rowOfferId);
    if (!rate || !hotel) return;
    setSelectedRate(rate);
    setStartingBooking(true);
    try {
      // childrenAges is the URL param (`5,7`); childAges is the API field name.
      // Forward both — without childAges the booking-boundary check at prebook
      // time throws "Child ages array (0) does not match children count (N)".
      const parsedChildAges = childrenAges
        ? childrenAges.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
        : [];
      const res = await fetch('/api/hotels/start-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: rate.offerId,
          hotelName: hotel.name,
          hotelId: hotel.id,
          stars: hotel.stars || 0,
          thumbnail: hotel.mainPhoto,
          city: city || hotel.city || '',
          checkIn: checkin,
          checkOut: checkout,
          adults: parseInt(adults),
          children: parseInt(children),
          ...(parsedChildAges.length > 0 ? { childAges: parsedChildAges } : {}),
          rooms: parseInt(rooms),
          totalPrice: rate.totalPrice,
          currency,
          localFees: localFees || 0,
          refundable: rate.refundable,
          checkInTime: hotel.checkInTime || null,
          checkOutTime: hotel.checkOutTime || null,
          // LiteAPI commission (our merchant margin on this rate) — optional,
          // only set when the rate response included it. Drives the admin
          // "Margin" column on the unified bookings store.
          ...(typeof rate.commission === 'number' && rate.commission > 0
            ? { commission: rate.commission }
            : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not start booking');
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Unexpected error');
      setStartingBooking(false);
    }
  };

  const handleBook = async () => {
    if (!offerId || !hotel) return;
    setStartingBooking(true);
    try {
      // Forward child ages — see handleSelectRate above for the why.
      const parsedChildAges = childrenAges
        ? childrenAges.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
        : [];
      const res = await fetch('/api/hotels/start-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          hotelName: hotel.name,
          hotelId: hotel.id,
          stars: hotel.stars || 0,
          thumbnail: hotel.mainPhoto,
          city: city || hotel.city || '',
          checkIn: checkin,
          checkOut: checkout,
          adults: parseInt(adults),
          children: parseInt(children),
          ...(parsedChildAges.length > 0 ? { childAges: parsedChildAges } : {}),
          rooms: parseInt(rooms),
          totalPrice: parseFloat(price),
          currency,
          localFees: localFees || 0,
          ...(refundable !== null ? { refundable } : {}),
          checkInTime: hotel.checkInTime || null,
          checkOutTime: hotel.checkOutTime || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not start booking');
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Unexpected error');
      setStartingBooking(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-[1100px] mx-auto px-5 pt-40 lg:pt-32 pb-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm font-semibold text-[#5C6378]">Loading hotel…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !hotel) {
    return (
      <>
        <Header />
        <main className="max-w-[1100px] mx-auto px-5 pt-40 lg:pt-32 pb-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="font-poppins font-bold text-red-700">{error || 'Hotel not found'}</p>
            <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Merge LiteAPI photos with Google Places photos (de-duplicated). Google
  // photos are appended after LiteAPI's so the booking-partner imagery still
  // leads, but visitors get more variety to scroll through.
  const liteapiPhotos = hotel.photos.length > 0 ? hotel.photos : (hotel.mainPhoto ? [hotel.mainPhoto] : []);
  const googlePhotos = googleInfo?.photos ?? [];
  const gallery = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of [...liteapiPhotos, ...googlePhotos]) {
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    return out;
  })();
  const mainImg = gallery[activePhoto] || hotel.mainPhoto;

  const numNights = checkin && checkout
    ? Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 0;

  const modalRate = modalOfferId ? rates.find((r) => r.offerId === modalOfferId) || null : null;
  const modalRoomMeta = modalRate
    ? roomMetaByName.get((modalRate.roomName || '').toLowerCase().trim()) || null
    : null;
  const modalBoardLabel = modalRate
    ? (modalRate.boardType || null)
    : null;

  // ── SEO: Hotel + AggregateRating + Review JSON-LD ──
  // Rich snippets for star rating, price, review score. Google uses this for
  // hotel pack listings and AI Overviews. Built client-side since the page is
  // a client component; crawlers still index it (Googlebot executes JS).
  const hotelJsonLd = (() => {
    const cheapestRate = rates.length > 0
      ? rates.reduce((min, r) => (r.totalPrice < min.totalPrice ? r : min), rates[0])
      : null;
    const priceNum = cheapestRate?.totalPrice ?? (price ? parseFloat(price) : null);
    const priceCcy = currency || 'GBP';
    const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://jetmeaway.co.uk/hotels/${hotel.id}`;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: hotel.name,
      url: pageUrl,
      ...(hotel.description ? { description: hotel.description.slice(0, 500) } : {}),
      ...(hotel.mainPhoto ? { image: [hotel.mainPhoto, ...hotel.photos.slice(0, 5)] } : {}),
      ...(hotel.stars ? { starRating: { '@type': 'Rating', ratingValue: hotel.stars, bestRating: 5 } } : {}),
      ...(hotel.address || hotel.city || hotel.country
        ? {
            address: {
              '@type': 'PostalAddress',
              ...(hotel.address ? { streetAddress: hotel.address } : {}),
              ...(hotel.city ? { addressLocality: hotel.city } : {}),
              ...(hotel.country ? { addressCountry: hotel.country } : {}),
            },
          }
        : {}),
      ...(hotel.latitude && hotel.longitude
        ? { geo: { '@type': 'GeoCoordinates', latitude: hotel.latitude, longitude: hotel.longitude } }
        : {}),
      ...(hotel.amenities.length
        ? {
            amenityFeature: hotel.amenities.slice(0, 20).map((a) => ({
              '@type': 'LocationFeatureSpecification',
              name: a,
              value: true,
            })),
          }
        : {}),
      ...(priceNum
        ? {
            priceRange: `${priceCcy} ${priceNum}`,
            makesOffer: {
              '@type': 'Offer',
              price: priceNum,
              priceCurrency: priceCcy,
              availability: 'https://schema.org/InStock',
              url: pageUrl,
            },
          }
        : {}),
      // Note: only aggregateRating is emitted — individual `review` items are
      // intentionally omitted. Our reviews come from LiteAPI (sourced from
      // Booking.com) and are not first-party collected. Google's review-snippet
      // policy treats third-party review arrays as spam risk. Aggregate score +
      // count is still Google-compliant and drives the star-rating rich snippet.
      ...(hotel.reviews && hotel.reviews.count > 0 && hotel.reviews.averageScore
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: hotel.reviews.averageScore,
              reviewCount: hotel.reviews.count,
              bestRating: 10,
              worstRating: 1,
            },
          }
        : {}),
    };
    return schema;
  })();

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLd) }}
      />
      {/* pt-40 on mobile clears the fixed header (90px) + sticky category
          bar (~55px). pt-28 on desktop matches the rest of the site. */}
      <main className="max-w-[1100px] mx-auto px-5 pt-40 lg:pt-28 pb-24 md:pb-16">
        {/* BACKLOG B4 (2026-04-21): Prominent "Back to search results" pill.
            User feedback — the browser back button lands on the empty /hotels
            state because the landing page is fully client-driven. Build an
            explicit back link that carries the original search params so
            /hotels re-hydrates (useEffect on line 1599 of hotels-client.tsx
            reads them) and auto-fires the search (autoSearched ref at 1831).
            Falls back to /hotels with no params if we don't have a city. */}
        <div className="mb-3">
          <a
            href={(() => {
              const qp = new URLSearchParams();
              if (city) qp.set('destination', city);
              if (checkin) qp.set('checkin', checkin);
              if (checkout) qp.set('checkout', checkout);
              if (adults) qp.set('adults', adults);
              if (children && children !== '0') qp.set('children', children);
              if (rooms) qp.set('rooms', rooms);
              const qs = qp.toString();
              return qs ? `/hotels?${qs}` : '/hotels';
            })()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#E8ECF4] text-[.78rem] font-poppins font-bold text-[#0a1628] hover:bg-[#FCFAF5] hover:border-[#E8D8A8] shadow-[0_2px_10px_rgba(10,22,40,0.04)] transition-colors"
            aria-label="Back to search results"
          >
            <i className="fa-solid fa-arrow-left text-[.7rem]" />
            Back to search{city ? ` in ${city}` : ' results'}
          </a>
        </div>

        {/* Phase-5: Breadcrumb — Home / Hotels / {City} / {Hotel} — anchored
            left so the hotel title sits on its own line below. Uses native
            <nav> + aria-label for screen readers. */}
        <nav aria-label="Breadcrumb" className="text-[.72rem] font-semibold text-[#8E95A9]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><a href="/" className="hover:text-[#0066FF] transition-colors">Home</a></li>
            <li aria-hidden>›</li>
            <li>
              <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="hover:text-[#0066FF] transition-colors">
                Hotels
              </a>
            </li>
            {city && (
              <>
                <li aria-hidden>›</li>
                <li>
                  <a href={`/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`} className="hover:text-[#0066FF] transition-colors">
                    {city}
                  </a>
                </li>
              </>
            )}
            <li aria-hidden>›</li>
            <li className="text-[#1A1D2B] truncate max-w-[240px]" title={hotel.name}>{hotel.name}</li>
          </ol>
        </nav>

        {/* Header — title row with stars, address, and a review-score tile
            on the right. The score tile is a placeholder shape until we wire
            live review data; it carries the structure so the layout stays
            honest in both states. */}
        <div className="mt-3 mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Stars count={hotel.stars} />
            <h1 className="font-poppins font-black text-[2rem] md:text-[2.4rem] text-[#1A1D2B] leading-tight mt-1">{hotel.name}</h1>
            {hotel.address && (
              <p className="text-[.85rem] text-[#5C6378] font-semibold mt-1">
                <i className="fa-solid fa-location-dot text-[.78rem] text-[#287DFA] mr-1" />
                {hotel.address}{hotel.city ? `, ${hotel.city}` : ''}
              </p>
            )}
            {/* Trust chip row — "Includes all taxes & fees" is the premium
                cue customers read for in every Booking.com listing. We keep
                it even when no rate is selected yet. */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[.68rem] font-bold">
                <i className="fa-solid fa-receipt text-[.62rem]" />
                Prices include all taxes & fees
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] text-[.68rem] font-bold">
                <i className="fa-solid fa-hand-holding-dollar text-[.62rem]" />
                No booking fees
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[.68rem] font-bold">
                <i className="fa-solid fa-shield-halved text-[.62rem]" />
                Scout Price Match
              </span>
            </div>
          </div>
        </div>

        {/* Gallery — swipeable horizontal carousel.
            Native scroll-snap so users can swipe on mobile and scroll/drag on
            desktop without any JS gesture handler. onScroll syncs activePhoto
            with the thumbnail strip; clicking a thumbnail scrolls the carousel
            to that slide. Desktop also gets prev/next arrow buttons over the
            image. Photo counter pill in the corner. */}
        {gallery.length > 0 && (
          <div className="mb-6">
            <div className="relative group w-full h-[280px] md:h-[460px] rounded-2xl overflow-hidden bg-[#F1F3F7]">
              <div
                ref={galleryRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  if (idx !== activePhoto && idx >= 0 && idx < gallery.length) {
                    setActivePhoto(idx);
                  }
                }}
                className="flex h-full w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}
              >
                {gallery.map((url, i) => (
                  <div key={i} className="relative flex-shrink-0 w-full h-full snap-start snap-always">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${hotel.name} — photo ${i + 1}`}
                      className="w-full h-full object-cover select-none"
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {/* Photo counter — only shown when there's more than one photo */}
              {gallery.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[.7rem] font-semibold tabular-nums backdrop-blur-sm">
                  {activePhoto + 1} / {gallery.length}
                </div>
              )}

              {/* Desktop arrows — hidden on touch (md+ only). Fade in on hover. */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => {
                      const el = galleryRef.current;
                      if (!el) return;
                      const target = Math.max(0, activePhoto - 1);
                      el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
                    }}
                    className="hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-[#0a1628] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fa-solid fa-chevron-left text-sm" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => {
                      const el = galleryRef.current;
                      if (!el) return;
                      const target = Math.min(gallery.length - 1, activePhoto + 1);
                      el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
                    }}
                    className="hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-[#0a1628] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fa-solid fa-chevron-right text-sm" />
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {gallery.slice(0, 12).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setActivePhoto(i);
                      const el = galleryRef.current;
                      if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
                    }}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? 'border-orange-500' : 'border-transparent'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Phase-5: Anchor sub-nav — smooth-scrolls to the main sections
            below. Booking.com's "Overview / Info & prices / Facilities /
            Reviews / Fine print" row; we keep a shorter Scout-voiced version
            so the page feels navigable from the top. Uses native anchor
            links so keyboard + screen-reader navigation comes for free. */}
        <nav
          aria-label="Sections"
          className="sticky top-[72px] z-20 -mx-5 md:-mx-0 px-5 md:px-0 py-2 bg-white/90 backdrop-blur-md border-y border-[#E8ECF4] mb-6"
        >
          <ul className="flex gap-1 overflow-x-auto text-[.78rem] font-semibold">
            <li><a href="#rooms" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">Rooms &amp; rates</a></li>
            {hotel.description && (
              <li><a href="#overview" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">Overview</a></li>
            )}
            {hotel.amenities.length > 0 && (
              <li><a href="#facilities" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">Facilities</a></li>
            )}
            {typeof hotel.latitude === 'number' && typeof hotel.longitude === 'number' && (
              <li><a href="#location" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">Location</a></li>
            )}
            {(hotel.checkInTime || hotel.checkOutTime) && (
              <li><a href="#policies" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">Policies</a></li>
            )}
            {/* BACKLOG B2 (2026-04-21, order tweak 2026-04-21): Reviews anchor
                is always shown — even when we have zero reviews the section
                renders a "No reviews yet" state per the ship rule ("Fall back
                to \"No reviews yet\" if LiteAPI returns nothing — do NOT hide
                the tab"). Positioned last in the nav so the section order
                matches the DOM order: ... → Policies → Reviews. */}
            {/* User request 2026-04-21: show the total review count inline
                with the Reviews nav link ("Reviews 10,573") — sub-nav has
                spare horizontal room and the number builds trust before the
                user even scrolls. Pill is only rendered when we actually
                have reviews so we don't print "Reviews 0" on empty. */}
            <li>
              <a href="#reviews" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">
                Reviews
                {hotel.reviews && hotel.reviews.count > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[#FAF3E6] ring-1 ring-[#E8D8A8] text-[#8a6d00] text-[.66rem] font-black px-2 py-0.5 tabular-nums">
                    {hotel.reviews.count.toLocaleString()}
                  </span>
                )}
              </a>
            </li>
          </ul>
        </nav>

        <div className="grid md:grid-cols-[1fr_340px] gap-6">
          {/* Left: rates table → description → amenities */}
          <div>
            {/* ═══ Scout Rooms Table ═══
                The primary action. Rendered BEFORE description so the
                customer sees the rate choices without scrolling. */}
            <div id="rooms" className="scroll-mt-[140px]" />
            {ratesLoading ? (
              <RoomsSkeleton />
            ) : rates.length > 0 ? (
              <div className="mb-5">
                <RoomsTable
                  offers={rates}
                  nights={numNights || 1}
                  selectedOfferId={selectedRate?.offerId || null}
                  roomMetaByName={roomMetaByName}
                  fallbackPhoto={hotel.mainPhoto || hotel.photos[0] || null}
                  onSelect={handleRowSelect}
                  onReserve={handleRowReserve}
                  onShowDetails={(oid) => setModalOfferId(oid)}
                />
              </div>
            ) : null}

            {hotel.description && (
              <section id="overview" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">About this hotel</h2>
                <p className="text-[.88rem] text-[#5C6378] font-medium leading-relaxed whitespace-pre-line">
                  {hotel.description.slice(0, 1200)}{hotel.description.length > 1200 ? '…' : ''}
                </p>
                {googleInfo?.editorialSummary && (
                  <div className="mt-4 pt-4 border-t border-[#E8ECF4]">
                    <div className="text-[.66rem] font-black uppercase tracking-[1px] text-[#8E95A9] mb-1.5">
                      <i className="fa-brands fa-google text-[.7rem] mr-1.5" />
                      Google says
                    </div>
                    <p className="text-[.84rem] text-[#1A1D2B] font-medium italic leading-relaxed">
                      {googleInfo.editorialSummary}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Hotel quick facts — phone, website, opening hours, Google Maps
                link. Only renders when at least one Google-sourced field is
                present so we don't show an empty card. */}
            {googleInfo && (googleInfo.phone || googleInfo.websiteUri || googleInfo.openingHours?.length || googleInfo.googleMapsUri) && (
              <section className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">Hotel info</h2>
                <ul className="space-y-2.5 text-[.84rem]">
                  {googleInfo.phone && (
                    <li className="flex items-start gap-3">
                      <i className="fa-solid fa-phone text-[#0066FF] mt-1 w-4 text-center" />
                      <a href={`tel:${googleInfo.phone.replace(/\s+/g, '')}`} className="text-[#0a1628] font-semibold hover:underline">
                        {googleInfo.phone}
                      </a>
                    </li>
                  )}
                  {googleInfo.websiteUri && (
                    <li className="flex items-start gap-3">
                      <i className="fa-solid fa-globe text-[#0066FF] mt-1 w-4 text-center" />
                      <a href={googleInfo.websiteUri} target="_blank" rel="nofollow noopener noreferrer" className="text-[#0a1628] font-semibold hover:underline truncate max-w-[300px]">
                        {googleInfo.websiteUri.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </li>
                  )}
                  {googleInfo.googleMapsUri && (
                    <li className="flex items-start gap-3">
                      <i className="fa-solid fa-map-location-dot text-[#0066FF] mt-1 w-4 text-center" />
                      <a href={googleInfo.googleMapsUri} target="_blank" rel="nofollow noopener noreferrer" className="text-[#0a1628] font-semibold hover:underline">
                        View on Google Maps
                      </a>
                    </li>
                  )}
                  {googleInfo.openingHours && googleInfo.openingHours.length > 0 && (
                    <li className="flex items-start gap-3">
                      <i className="fa-solid fa-clock text-[#0066FF] mt-1 w-4 text-center" />
                      <div className="flex-1">
                        <div className="text-[#0a1628] font-semibold mb-1">Reception hours</div>
                        <ul className="text-[.76rem] text-[#5C6378] font-medium space-y-0.5">
                          {googleInfo.openingHours.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {typeof hotel.latitude === 'number' && typeof hotel.longitude === 'number' && (
              <section id="location" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">Location</h2>
                {hotel.address && (
                  <p className="text-[.82rem] text-[#5C6378] font-semibold mb-3">
                    {hotel.address}{hotel.city ? `, ${hotel.city}` : ''}
                  </p>
                )}
                {/* Silent Scout — inline neighbourhood panel.
                    Replaces the stand-alone Leaflet map with a richer map +
                    tabbed "what's nearby in 12 min" list. Default tab is
                    picked silently from party composition × destination vibe
                    so a 2-adult Lisbon stay lands on Food, a family stay
                    lands on Family, etc. */}
                <ScoutSidebar
                  embedded
                  hotelName={hotel.name}
                  latitude={hotel.latitude}
                  longitude={hotel.longitude}
                  defaultTab={chooseDefaultTab({
                    adults: parseInt(adults, 10) || 2,
                    children: parseInt(children, 10) || 0,
                    vibeTags: vibeTagsForSearchedCity(city || hotel.city),
                  })}
                />
              </section>
            )}

            {hotel.amenities.length > 0 && (
              <section id="facilities" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">Most popular facilities</h2>
                <p className="text-[.74rem] text-[#8E95A9] font-semibold mb-4">
                  What this property offers to every guest — pulled live from the hotel&apos;s own facility list.
                </p>
                {/* Phase-5: Amenity chip grid — each amenity gets a dedicated
                    icon drawn from HOTEL_AMENITY_ICON_MAP. Unknown amenities
                    fall back to a generic check so we never show an empty
                    square. Three columns on desktop, two on tablet, one on
                    phone — matches Booking.com's density without feeling
                    cramped. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
                  {hotel.amenities.slice(0, 30).map((a, i) => {
                    const info = resolveAmenityIcon(a);
                    return (
                      <div key={i} className="flex items-center gap-2.5 text-[.82rem] text-[#0a1628] font-semibold leading-snug">
                        <span className="w-7 h-7 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] flex items-center justify-center shrink-0">
                          <i className={`fa-solid ${info} text-[.74rem]`} />
                        </span>
                        <span className="truncate">{a}</span>
                      </div>
                    );
                  })}
                </div>
                {hotel.amenities.length > 30 && (
                  <p className="mt-4 text-[.72rem] text-[#5C6378] font-semibold">
                    +{hotel.amenities.length - 30} more facilities available at the property
                  </p>
                )}
              </section>
            )}

            {(hotel.checkInTime || hotel.checkOutTime || (hotel.policies && hotel.policies.length > 0)) && (
              <section id="policies" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">House rules &amp; policies</h2>
                <p className="text-[.74rem] text-[#8E95A9] font-semibold mb-4">
                  Straight from the property — times, parking, pets, children.
                </p>

                {/* Check-in / Check-out as a pair of champagne tiles — same
                    visual weight as the sidebar stay-schedule block so the
                    times read unambiguously. */}
                {(hotel.checkInTime || hotel.checkOutTime) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {hotel.checkInTime && (
                      <div className="rounded-xl bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 p-3.5">
                        <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-[#8a6d00] mb-1">
                          Check-in from
                        </div>
                        <div className="font-[var(--font-playfair)] font-black text-[1.35rem] text-[#0a1628] leading-none">
                          {hotel.checkInTime}
                        </div>
                      </div>
                    )}
                    {hotel.checkOutTime && (
                      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3.5">
                        <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-slate-500 mb-1">
                          Check-out by
                        </div>
                        <div className="font-[var(--font-playfair)] font-black text-[1.35rem] text-[#0a1628] leading-none">
                          {hotel.checkOutTime}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* v2-plan step-4: policy cards from LiteAPI `policies[]` —
                    internet / parking / pets / children / groups. Icon in a
                    champagne badge on the left, name + description on the
                    right. Two-column on tablet+. */}
                {hotel.policies && hotel.policies.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hotel.policies.map((p, i) => (
                      <div key={`${p.kind}-${i}`} className="flex gap-3">
                        <span className="w-9 h-9 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] flex items-center justify-center shrink-0">
                          <i className={`fa-solid ${POLICY_ICON[p.kind]} text-[.82rem]`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-poppins font-bold text-[.82rem] text-[#0a1628] leading-tight">
                            {p.name}
                          </div>
                          {p.description && (
                            <p className="text-[.78rem] text-[#5C6378] font-medium leading-snug mt-1">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* BACKLOG B2 (2026-04-21, reorder 2026-04-21): Reviews section.
                Positioned LAST on the detail page per user request — after
                Policies, so the page ends on social proof rather than legal
                copy. Always renders: the header shows a score tile when we
                have data, and the body falls back to "No reviews yet" when
                LiteAPI returned nothing. Ship rule was explicit: do NOT hide
                the section. */}
            <section id="reviews" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">Guest reviews</h2>
                  <p className="text-[.74rem] text-[#8E95A9] font-semibold">
                    Verified reviews from recent guests — pulled live from our property partner.
                  </p>
                </div>
                {hotel.reviews && typeof hotel.reviews.averageScore === 'number' && hotel.reviews.count > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-center min-w-[68px]">
                      <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-emerald-700 leading-none">
                        {hotel.reviews.averageScore.toFixed(1)}
                      </div>
                      <div className="text-[.58rem] font-black uppercase tracking-wider text-emerald-700 mt-1">
                        out of 10
                      </div>
                    </div>
                    <div className="text-[.75rem]">
                      <div className="font-poppins font-black text-[.92rem] text-[#0a1628] leading-tight">
                        {scoreLabel(hotel.reviews.averageScore)}
                      </div>
                      {/* User request 2026-04-21: label "Reviews" on top, total
                          count directly underneath — two-line stack so the
                          number reads as the dominant datum. */}
                      <div className="text-[#8E95A9] font-semibold text-[.66rem] uppercase tracking-[.8px] mt-1">
                        Reviews
                      </div>
                      <div className="text-[#0a1628] font-poppins font-black text-[1.05rem] leading-tight">
                        {hotel.reviews.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {hotel.reviews && hotel.reviews.list.length > 0 ? (
                (() => {
                  // Reviews stay ON our site — no click-through to Booking.com.
                  // Earlier versions linked every review card + a "Read all on
                  // Booking.com" CTA to a Booking.com search results page (with
                  // our affiliate aid=318615 preserved). That was a net loss:
                  // Booking.com's affiliate cut (~3-4%) is materially smaller
                  // than the LiteAPI direct commission we earn when the
                  // customer books on our own site (~5-15%), AND the trust hit
                  // of suddenly being on a competitor's domain mid-decision is
                  // real. The reviews themselves are still presented as
                  // verified — the count + "via Booking.com" attribution at
                  // the footer of the section preserves the social-proof
                  // origin without sending traffic away. (2026-04-29)
                  return (
                <>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotel.reviews.list.slice(0, 5).map((r, i) => (
                    <li key={`${r.name}-${r.date || ''}-${i}`}>
                    <div
                      className="block rounded-xl bg-[#FAFBFC] ring-1 ring-[#E8ECF4] p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="font-poppins font-bold text-[.82rem] text-[#0a1628] truncate">
                            {r.name}
                          </div>
                          <div className="text-[.68rem] text-[#8E95A9] font-semibold flex items-center gap-1.5 flex-wrap">
                            {r.country && <span>{r.country}</span>}
                            {r.type && (
                              <>
                                <span aria-hidden>·</span>
                                <span>{r.type}</span>
                              </>
                            )}
                            {r.date && (
                              <>
                                <span aria-hidden>·</span>
                                <span>{formatReviewDate(r.date)}</span>
                              </>
                            )}
                            {r.language && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[.56rem] font-black uppercase tracking-wider">
                                {r.language}
                              </span>
                            )}
                          </div>
                        </div>
                        {typeof r.score === 'number' && (
                          <span className="shrink-0 inline-flex items-center justify-center min-w-[36px] h-[28px] rounded-lg bg-emerald-600 text-white text-[.78rem] font-black px-2">
                            {r.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {r.headline && (
                        <p className="font-poppins font-bold text-[.82rem] text-[#1A1D2B] mb-1.5 leading-snug">
                          “{r.headline}”
                        </p>
                      )}
                      {r.pros && (
                        <div className="flex gap-2 mb-1 items-start">
                          <i className="fa-solid fa-thumbs-up text-[.68rem] text-emerald-600 mt-0.5 shrink-0" />
                          <p className="text-[.78rem] text-[#1A1D2B] font-medium leading-snug">
                            {r.pros}
                          </p>
                        </div>
                      )}
                      {r.cons && (
                        <div className="flex gap-2 items-start">
                          <i className="fa-solid fa-thumbs-down text-[.68rem] text-[#b8860b] mt-0.5 shrink-0" />
                          <p className="text-[.78rem] text-[#5C6378] font-medium leading-snug">
                            {r.cons}
                          </p>
                        </div>
                      )}
                    </div>
                    </li>
                  ))}
                </ul>
                {/* BACKLOG B2 tweak (2026-04-21): Booking.com-style review-count
                    footer beneath the list. Shows how many of the total
                    verified reviews are visible — anchors social proof at the
                    bottom of the section so the page closes on a strong
                    number, not on the last review card. */}
                <div className="mt-5 pt-4 border-t border-[#E8ECF4] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[.82rem] text-[#0a1628] font-poppins font-bold">
                    Showing {Math.min(5, hotel.reviews.list.length)} of{' '}
                    <span className="font-black">{hotel.reviews!.count.toLocaleString()}</span>{' '}
                    verified guest review{hotel.reviews!.count === 1 ? '' : 's'}
                  </p>
                  {typeof hotel.reviews.averageScore === 'number' && (
                    <p className="text-[.72rem] text-[#5C6378] font-semibold">
                      <i className="fa-solid fa-shield-check text-emerald-600 mr-1.5" />
                      {scoreLabel(hotel.reviews.averageScore)} · {hotel.reviews.averageScore.toFixed(1)}/10 average
                    </p>
                  )}
                </div>
                {/* Verified-source attribution — static, no link-out.
                    Earlier versions had a "Read all on Booking.com" CTA
                    here (with our aid=318615) — removed 2026-04-29 to stop
                    leaking traffic to a competitor mid-decision. The
                    "via Booking.com" line preserves the social-proof
                    origin without sending users away. */}
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[.72rem] font-bold">
                  <i className="fa-solid fa-shield-halved text-[.7rem]" aria-hidden />
                  {hotel.reviews.count.toLocaleString()} verified reviews via Booking.com
                </div>
                </>
                  );
                })()
              ) : (
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-5 text-center">
                  <i className="fa-solid fa-comment-dots text-[1.1rem] text-slate-400 mb-2" />
                  <p className="font-poppins font-bold text-[.86rem] text-[#0a1628] mb-1">
                    No reviews yet
                  </p>
                  <p className="text-[.74rem] text-[#5C6378] font-medium max-w-[380px] mx-auto">
                    This property hasn&apos;t been reviewed on our network yet. Once guests complete their stay, their feedback will appear here.
                  </p>
                </div>
              )}

              {/* Google reviews block — additive to LiteAPI/Booking.com reviews
                  above. Only renders when Google returned at least one review.
                  Shows the aggregate Google rating + count alongside the cards
                  so the social-proof score from a different source compounds. */}
              {googleInfo && googleInfo.reviews.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#E8ECF4]">
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">
                        <i className="fa-brands fa-google text-[.86rem] mr-2" />
                        Google reviews
                      </h3>
                      <p className="text-[.72rem] text-[#8E95A9] font-semibold">
                        Live from Google — independent traveller feedback.
                      </p>
                    </div>
                    {typeof googleInfo.rating === 'number' && (
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-center min-w-[68px]">
                          <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-amber-700 leading-none">
                            {googleInfo.rating.toFixed(1)}
                          </div>
                          <div className="text-[.58rem] font-black uppercase tracking-wider text-amber-700 mt-1">
                            out of 5
                          </div>
                        </div>
                        {typeof googleInfo.ratingCount === 'number' && googleInfo.ratingCount > 0 && (
                          <div className="text-[.75rem]">
                            <div className="text-[#8E95A9] font-semibold text-[.66rem] uppercase tracking-[.8px]">
                              Google reviews
                            </div>
                            <div className="text-[#0a1628] font-poppins font-black text-[1.05rem] leading-tight">
                              {googleInfo.ratingCount.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {googleInfo.reviews.map((r, i) => (
                      <li key={`g-${i}`}>
                        <div className="rounded-xl bg-[#FAFBFC] ring-1 ring-[#E8ECF4] p-4">
                          <div className="flex items-start gap-3 mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {r.authorPhoto && (
                              <img src={r.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" loading="lazy" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-poppins font-bold text-[.82rem] text-[#0a1628] truncate">
                                {r.authorName}
                              </div>
                              <div className="text-[.68rem] text-[#8E95A9] font-semibold flex items-center gap-1.5 flex-wrap">
                                <span aria-label={`Rating ${r.rating} of 5`}>
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <i key={idx} className={`fa-solid fa-star text-[.6rem] ${idx < Math.round(r.rating) ? 'text-amber-500' : 'text-slate-300'}`} />
                                  ))}
                                </span>
                                {r.relativeTime && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span>{r.relativeTime}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-[.78rem] text-[#1A1D2B] font-medium leading-snug line-clamp-6">
                            {r.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[.66rem] text-[#8E95A9] font-medium">
                    Reviews shown via the Google Places API — Google branding remains the property of Google.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right: booking summary.
              `will-change-transform` keeps the GPU hot so the row-click
              "breathe" (scale 1.00 → 1.02 → 1.00 over 260ms) is buttery,
              not jagged. The transform is only applied while sidebarBreathe
              is true, then settles back to identity. */}
          <aside
            style={{ willChange: 'transform' }}
            className={`bg-white border border-[#E8ECF4] rounded-2xl p-6 h-fit sticky top-24 transition-transform duration-[180ms] ease-out ${
              sidebarBreathe ? 'scale-[1.02]' : 'scale-100'
            }`}
          >
            {/* Scout Alert badge */}
            {signalType && (
              <div className={`mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[.68rem] font-black uppercase tracking-[1px] ${
                signalType === 'high_demand' ? 'bg-red-50 text-red-600 border border-red-200' :
                signalType === 'selling_fast' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                'bg-blue-50 text-blue-600 border border-blue-200'
              }`}>
                <i className={`fa-solid ${signalType === 'high_demand' ? 'fa-fire' : signalType === 'selling_fast' ? 'fa-bolt' : 'fa-circle-info'} text-[.6rem]`} />
                Scout Alert: {signalType.replace(/_/g, ' ')}
              </div>
            )}

            {/* Sidebar price — prefer the row the user has selected in the
                Rooms Table (so clicks feel live), fall back to the URL-param
                price when rates haven't loaded yet. */}
            {(selectedRate || price) && (
              <>
                <div className="text-[.7rem] font-bold text-[#8E95A9] uppercase tracking-wide">Total for {numNights || '—'} night{numNights !== 1 ? 's' : ''}</div>
                {selectedRate && selectedRate.negotiatedPrice != null && selectedRate.marketPrice != null && selectedRate.negotiatedPrice < selectedRate.marketPrice ? (
                  /* Phase-3: selected row carries its own Scout Deal — show
                     ribbon + strike-through market + emerald savings line,
                     sourced from the row (not the URL params). */
                  <div className="mt-1">
                    <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">Scout Deal</span>
                    <div className="text-[.85rem] text-[#8E95A9] font-bold line-through">
                      {currency === 'GBP' ? '£' : `${currency} `}{selectedRate.marketPrice.toFixed(2)}
                    </div>
                    <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none">
                      {currency === 'GBP' ? '£' : `${currency} `}{selectedRate.negotiatedPrice.toFixed(2)}
                    </div>
                    <div className="text-[.68rem] text-green-600 font-bold mt-0.5">
                      You save {currency === 'GBP' ? '£' : `${currency} `}{(selectedRate.marketPrice - selectedRate.negotiatedPrice).toFixed(2)}
                    </div>
                  </div>
                ) : selectedRate ? (
                  <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none mt-1">
                    {currency === 'GBP' ? '£' : `${currency} `}{selectedRate.totalPrice.toFixed(2)}
                  </div>
                ) : mktPrice != null && negPrice != null && negPrice < mktPrice ? (
                  <div className="mt-1">
                    <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">Scout Deal</span>
                    <div className="text-[.85rem] text-[#8E95A9] font-bold line-through">
                      {currency === 'GBP' ? '£' : `${currency} `}{mktPrice.toFixed(2)}
                    </div>
                    <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none">
                      {currency === 'GBP' ? '£' : `${currency} `}{negPrice.toFixed(2)}
                    </div>
                    <div className="text-[.68rem] text-green-600 font-bold mt-0.5">
                      You save {currency === 'GBP' ? '£' : `${currency} `}{(mktPrice - negPrice).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none mt-1">
                    {currency === 'GBP' ? '£' : `${currency} `}{parseFloat(price).toFixed(2)}
                  </div>
                )}
                {/* Wholesale-rate signal — appears under the price in
                    the booking sidebar. Free-cancellation note matches
                    real LiteAPI behaviour: flexible rates carry a
                    cancellation deadline, locked rates clearly don't.
                    No comparative claims against named competitors. */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[.7rem] font-bold leading-snug">
                  <span aria-hidden="true">💰</span>
                  Live wholesale rate · Free cancellation on flexible rates
                </div>
              </>
            )}
            <div className="mt-4 space-y-2 text-[.82rem] text-[#5C6378] font-semibold">
              {checkin && <div className="flex justify-between"><span>Check-in</span><strong className="text-[#1A1D2B]">{checkin}</strong></div>}
              {checkout && <div className="flex justify-between"><span>Check-out</span><strong className="text-[#1A1D2B]">{checkout}</strong></div>}
              <div className="flex justify-between">
                <span>Guests</span>
                <strong className="text-[#1A1D2B]">{adults} adult{adults !== '1' ? 's' : ''}{children !== '0' ? `, ${children} child${children !== '1' ? 'ren' : ''}` : ''}</strong>
              </div>
              {rooms !== '1' && <div className="flex justify-between"><span>Rooms</span><strong className="text-[#1A1D2B]">{rooms}</strong></div>}
            </div>

            {/* Stay schedule — Scout voice.
                Most hotels open rooms around 2pm and turn them over by 10am.
                Surfacing this in the sidebar (not buried in fine print)
                prevents the classic "I arrived at 11am, why is my room not
                ready?" complaint. Champagne chip, emerald dot for the arrival
                window, slate outline for the departure — stated, not scolded. */}
            {(hotel.checkInTime || hotel.checkOutTime) && (
              <div className="mt-4 bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 rounded-xl p-3">
                <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-[#8a6d00] mb-2">
                  Your stay schedule
                </div>
                <div className="space-y-1.5 text-[.78rem]">
                  {hotel.checkInTime && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                      <span className="font-semibold text-[#0a1628]">Check-in from <strong>{hotel.checkInTime}</strong></span>
                    </div>
                  )}
                  {hotel.checkOutTime && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full border border-slate-400 shrink-0" aria-hidden />
                      <span className="font-medium text-slate-600">Check-out by <strong className="text-[#0a1628]">{hotel.checkOutTime}</strong></span>
                    </div>
                  )}
                </div>
                <p className="text-[.66rem] text-slate-500 font-medium mt-2 leading-snug">
                  Arriving early? Reception will store your bags so you can wander.
                </p>
              </div>
            )}

            {/* Refundable / Board type badges — reflect selected row when
                present so the sidebar is always a faithful summary. Scout
                palette: emerald solid for positives, slate outline for the
                neutral "stated, not scolded" facts (no red). */}
            {(() => {
              const effRefundable = selectedRate ? selectedRate.refundable : refundable;
              const effBoard = selectedRate?.boardType || boardType;
              if (effRefundable === null && !effBoard) return null;
              return (
                <div className="mt-3 flex flex-wrap gap-2">
                  {effRefundable !== null && (
                    effRefundable ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.72rem] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
                        Free cancellation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.72rem] font-semibold bg-slate-50 border border-slate-200 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-300" aria-hidden />
                        Non-refundable
                      </span>
                    )
                  )}
                  {effBoard && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.72rem] font-bold bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00]">
                      <i className="fa-solid fa-utensils text-[.62rem]" />
                      {effBoard}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Perks */}
            {perks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {perks.map((perk) => {
                  const info = PERK_ICONS[perk] || { icon: 'fa-gift', label: perk.replace(/_/g, ' ') };
                  return (
                    <span key={perk} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[.68rem] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <i className={`fa-solid ${info.icon} text-[.58rem]`} />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            )}

            {(selectedRate || offerId) ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedRate) {
                    handleRowReserve(selectedRate.offerId);
                  } else {
                    handleBook();
                  }
                }}
                disabled={startingBooking}
                className="w-full mt-5 bg-[#0a1628] hover:bg-[#0066FF] disabled:opacity-60 text-white font-poppins font-bold text-[.92rem] py-3.5 rounded-xl transition-all shadow-[0_6px_22px_rgba(10,22,40,0.22)] flex items-center justify-center gap-2"
              >
                {startingBooking ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <><i className="fa-solid fa-lock text-[.78rem]" /> Reserve with Scout →</>
                )}
              </button>
            ) : (
              <a
                href={(() => {
                  // Forward the current query params (checkin/checkout/adults/children/rooms)
                  // to /hotels so the search form arrives pre-filled. Also carry the city
                  // name as `destination` so the autocomplete resolves.
                  const p = new URLSearchParams();
                  const carry = ['checkin', 'checkout', 'adults', 'children', 'rooms'];
                  for (const k of carry) {
                    const v = sp?.get(k);
                    if (v) p.set(k, v);
                  }
                  const dest = sp?.get('city') || city || '';
                  if (dest) p.set('destination', dest);
                  const qs = p.toString();
                  return qs ? `/hotels?${qs}` : '/hotels';
                })()}
                className="block text-center w-full mt-5 bg-orange-500 hover:bg-orange-600 text-white font-poppins font-black text-[.9rem] py-3.5 rounded-xl transition-all"
              >
                Search dates to book
              </a>
            )}
            <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">Secure checkout · Free cancellation on most rates</p>
          </aside>
        </div>

        {/* ── Similar Hotels ── */}
        {(similarLoading || similarHotels.length > 0) && (
          <section className="mt-10">
            <h2 className="font-poppins font-black text-[1.3rem] text-[#1A1D2B] mb-5">
              More Hotels in {city || 'this area'}
            </h2>

            {similarLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-40 bg-[#F1F3F7]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-2/3 bg-[#F1F3F7] rounded" />
                      <div className="h-3 w-1/2 bg-[#F1F3F7] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarHotels.map((sh) => {
                  const similarHref = `/hotels/${encodeURIComponent(String(sh.id))}?checkin=${checkin}&checkout=${checkout}&adults=${adults}&children=${children}&rooms=${rooms}&city=${encodeURIComponent(city)}${sh.totalPrice ? `&price=${sh.totalPrice}` : `&price=${sh.pricePerNight * numNights}`}&currency=${sh.currency || 'GBP'}${sh.offerId ? `&offerId=${sh.offerId}` : ''}${sh.boardType ? `&board=${encodeURIComponent(sh.boardType)}` : ''}${typeof sh.refundable === 'boolean' ? `&refundable=${sh.refundable ? '1' : '0'}` : ''}`;

                  return (
                    <a
                      key={sh.id}
                      href={similarHref}
                      className="group bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(0,102,255,0.08)] hover:border-blue-200 transition-all"
                    >
                      {/* Photo */}
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50">
                        {sh.thumbnail ? (
                          <img
                            src={sh.thumbnail}
                            alt={sh.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🛏</div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-4">
                        <div className="flex items-center gap-1 mb-1">
                          {sh.stars > 0 && Array.from({ length: Math.min(5, sh.stars) }).map((_, i) => (
                            <i key={i} className="fa-solid fa-star text-amber-400 text-[.6rem]" />
                          ))}
                        </div>
                        <h3 className="font-poppins font-bold text-[.88rem] text-[#1A1D2B] truncate mb-1">{sh.name}</h3>
                        {sh.district && (
                          <p className="text-[.7rem] text-[#8E95A9] font-semibold mb-2 truncate">📍 {sh.district}</p>
                        )}
                        {sh.boardType && (
                          <span className="text-[.6rem] text-purple-600 font-bold">{sh.boardType}</span>
                        )}
                        <div className="flex items-end justify-between mt-2">
                          <div>
                            <span className="text-[.6rem] text-[#8E95A9] font-semibold">from </span>
                            <span className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] leading-none">
                              £{Math.round(sh.pricePerNight)}
                            </span>
                            <span className="text-[.6rem] text-[#8E95A9] font-semibold">/night</span>
                          </div>
                          <span className="text-[#0066FF] text-[.68rem] font-bold group-hover:translate-x-0.5 transition-transform">
                            View →
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Phase-5: Mobile sticky-bottom CTA — pinned to the viewport on
          phones so the Reserve action is always one tap away, regardless of
          how far the customer has scrolled into the amenities / description.
          Hidden on md+ where the sidebar stays in view. */}
      {(selectedRate || offerId) && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-white/98 backdrop-blur-md border-t border-[#E8ECF4] shadow-[0_-8px_24px_rgba(10,22,40,0.12)] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[.58rem] font-semibold text-slate-500 uppercase tracking-[1.5px]">
              Total for {numNights || '—'} {numNights === 1 ? 'night' : 'nights'}
            </div>
            <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-[#0a1628] leading-none">
              {currency === 'GBP' ? '£' : `${currency} `}
              {selectedRate ? selectedRate.totalPrice.toFixed(2) : (price ? parseFloat(price).toFixed(2) : '—')}
            </div>
            {selectedRate?.excludedTaxes != null && selectedRate.excludedTaxes > 0 && (
              <div className="text-[.62rem] font-medium text-slate-500 mt-0.5">
                + £{Math.round(selectedRate.excludedTaxes)} city tax at property
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedRate) handleRowReserve(selectedRate.offerId);
              else handleBook();
            }}
            disabled={startingBooking}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0a1628] hover:bg-[#0066FF] disabled:opacity-60 text-white font-poppins font-bold text-[.82rem] rounded-full px-5 py-3 shadow-[0_8px_18px_rgba(10,22,40,0.25)] transition-all"
          >
            {startingBooking ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><i className="fa-solid fa-lock text-[.72rem]" /> Reserve →</>
            )}
          </button>
        </div>
      )}

      {/* Phase-4: Room detail modal — opens when the user clicks a room
          thumbnail or "See details" link in the RoomsTable. Reuses
          handleRowReserve so the primary action stays consistent. */}
      <RoomDetailModal
        open={Boolean(modalOfferId && modalRoomMeta)}
        onClose={() => setModalOfferId(null)}
        onReserve={() => {
          if (modalOfferId) {
            handleRowReserve(modalOfferId);
          }
        }}
        room={modalRoomMeta}
        totalPrice={modalRate?.totalPrice ?? null}
        pricePerNight={modalRate?.pricePerNight ?? null}
        nights={numNights || 1}
        currency={currency}
        boardLabel={modalBoardLabel}
        refundable={modalRate?.refundable ?? null}
        excludedTaxes={modalRate?.excludedTaxes ?? null}
        reserving={startingBooking}
        fallbackPhotos={gallery}
      />

      <Footer />

      {/* ── Back to top ──
          Floating round button, fixed bottom-right, only visible once the
          user has scrolled past the hero. Uses smooth scroll so the jump
          doesn't feel jarring. Sits above the mobile category bar (z-[101])
          but below the header menu (z-[200]) and checkout flows. */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        className={`fixed bottom-6 z-[150] inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#0066FF] text-white text-[.85rem] font-bold shadow-[0_6px_20px_rgba(0,102,255,0.45)] transition-opacity duration-200 hover:bg-[#0052d6] ${
          showBackToTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <i className="fa-solid fa-arrow-up text-[.9rem]" aria-hidden />
        Back to top
      </button>
    </>
  );
}
