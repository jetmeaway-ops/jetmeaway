'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DateRangePicker from '@/components/DateRangePicker';
import { redirectUrl } from '@/lib/redirect';
import RoomsTable, { type RoomRate } from './RoomsTable';
import RoomsSkeleton from './RoomsSkeleton';
import RoomDetailModal from './RoomDetailModal';
import HotelBackdrop from '@/components/HotelBackdrop';
import { chooseDefaultTab } from '@/lib/silentScout';
import { createRoomResolver } from '@/lib/room-match';
import { vibeTagsForSearchedCity } from '@/data/destinations';
import { NEW_TAB_PARAM } from '@/lib/new-tab';
import { currencyPrefix, normaliseDisplayCurrency } from '@/lib/pricing-currency';
import FavouriteButton from '@/components/FavouriteButton';
import { useTranslations } from 'next-intl';

// Leaflet touches `window` on import, so SSR must be disabled. ScoutSidebar
// renders its own Leaflet map when embedded on the detail page, replacing the
// stand-alone HotelMap in the Location section — one map, richer signal.
const ScoutSidebar = dynamic(() => import('@/components/ScoutSidebar'), { ssr: false });
const HotelLocationModal = dynamic(() => import('@/components/HotelLocationModal'), { ssr: false });

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
  if (score >= 9) return 'superb';
  if (score >= 8) return 'veryGood';
  if (score >= 7) return 'good';
  if (score >= 6) return 'pleasant';
  if (score >= 4) return 'mixed';
  return 'limited';
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
  const router = useRouter();
  const id = params?.id || '';
  const t = useTranslations('hotelDetail');
  // Map popup strings live in the shared `hotels` namespace so the card and
  // the detail page draw the same "Show on map" experience from one source.
  const th = useTranslations('hotels');
  const [locOpen, setLocOpen] = useState(false);
  // The searched reference (landmark / place) carried over from the results
  // page via buildDetailHref, so the popup can pin it and show the distance.
  const refLat = parseFloat(sp?.get('refLat') || '');
  const refLng = parseFloat(sp?.get('refLng') || '');
  const refLabel = sp?.get('refLabel') || '';
  // The hotel's own coords, carried from the results list via buildDetailHref.
  // Used as a fallback when the /details response omits lat/lng (it does for
  // some hotels), so the map + "Show on map" show on every hotel from search.
  const urlHotelLat = parseFloat(sp?.get('hlat') || '');
  const urlHotelLng = parseFloat(sp?.get('hlng') || '');

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

  // Effective map coordinates: prefer the detail response, fall back to the
  // list coords passed in the URL. Drives the "Show on map" popup AND the
  // Location section, so both appear on every hotel that had coords in search.
  const mapLat = hotel && typeof hotel.latitude === 'number' ? hotel.latitude : (Number.isFinite(urlHotelLat) ? urlHotelLat : NaN);
  const mapLng = hotel && typeof hotel.longitude === 'number' ? hotel.longitude : (Number.isFinite(urlHotelLng) ? urlHotelLng : NaN);
  const hasMapCoords = Number.isFinite(mapLat) && Number.isFinite(mapLng);

  // ── Back-to-top button ──
  // The detail page is long (rooms → description → facilities → policies →
  // reviews → similar hotels). Once the user has tapped a section link in
  // the sticky nav they're deep in the page and need a one-tap escape hatch
  // back to the hero. Fade in after ~600px of scroll — below that the page
  // header is still in view and the button is redundant.
  // Phase-4: Room detail modal state. We track the offerId (not the rate
  // object) so the modal always reflects the latest row data if the rates
  // array updates under it.
  const [modalOfferId, setModalOfferId] = useState<string | null>(null);
  // In-progress date selection for the sidebar picker. The picker is
  // controlled from the URL params; this holds the half-picked range
  // (start clicked, end pending) so the UI tracks the click before we
  // commit the full range to the URL.
  const [pickDates, setPickDates] = useState<{ start: string; end: string } | null>(null);
  // Editable occupancy (2026-07-03, owner request): blog deep links land
  // with the default 2 adults — families adjust adults/children right here
  // and the rates table refetches live. Committed to the URL like dates.
  const updateOccupancy = (nextAdults: number, nextAges: number[], nextRooms?: number) => {
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('adults', String(nextAdults));
    q.set('children', String(nextAges.length));
    if (nextAges.length) q.set('childrenAges', nextAges.join(','));
    else q.delete('childrenAges');
    if (nextRooms !== undefined) {
      if (nextRooms > 1) q.set('rooms', String(nextRooms));
      else q.delete('rooms');
    }
    // Stale for the new occupancy — price belongs to the old party size.
    ['offerId', 'price', 'negPrice', 'mktPrice'].forEach((k) => q.delete(k));
    router.replace(`/hotels/${encodeURIComponent(String(id))}?${q.toString()}`, { scroll: false });
  };

  // Search context passed from /hotels results (for the Book button).
  // Deep-link support (2026-07-02): blog posts link straight to a hotel by
  // LiteAPI id with NO search context. Default to the same window the
  // search form uses (check-in ~2 weeks out, 3 nights) so live rooms load
  // immediately instead of a rate-less dead end; the sidebar date picker
  // below lets the visitor change dates in place.
  const defaultDates = useMemo(() => {
    const plus = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };
    return { cin: plus(14), cout: plus(17) };
  }, []);
  const offerId = sp?.get('offerId') || '';
  const checkin = sp?.get('checkin') || defaultDates.cin;
  const checkout = sp?.get('checkout') || defaultDates.cout;
  const adults = sp?.get('adults') || '2';
  const children = sp?.get('children') || '0';
  const childrenAges = sp?.get('childrenAges') || '';
  const rooms = sp?.get('rooms') || '1';
  // Exact per-room split carried from the results page (e.g. an auto-split
  // family of five). When present, the rates + similar fetches forward it so
  // this page prices the SAME rooms the visitor saw, not a re-split from the
  // flat counts. See buildDetailHref in hotels-client.tsx.
  const occ = sp?.get('occ') || '';
  const price = sp?.get('price') || '';
  // Every price on this page comes from getHotels() (via /api/hotels/rates),
  // and that layer force-converts EVERY supplier response into GBP before it
  // returns — see FX_TO_GBP / `finalCurrency = 'GBP'` in src/lib/liteapi.ts.
  // So the numbers here are always pounds, whatever the URL says.
  //
  // Taking the label straight from `?currency=` therefore printed e.g.
  // "INR 412.50" over a sterling amount. That was not only a wrong price on
  // screen: the same value was POSTed to /api/hotels/start-booking (so the
  // stored booking claimed a currency it wasn't in) and published as
  // schema.org `priceCurrency`. Honest label = the currency the money is
  // actually in, so anything we cannot genuinely price in falls back to GBP.
  // When the pricing layer can really return another currency, add it here.
  const currency = normaliseDisplayCurrency(sp?.get('currency'));
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

  // Hotel detail opens in a new tab from the results page (see lib/new-tab.ts),
  // which is what keeps the results page mounted and its scroll position real.
  // The flag tells us to close rather than re-search when the visitor is done.
  const openedInNewTab = sp?.get(NEW_TAB_PARAM) === '1';
  const backToResultsHref = useMemo(() => {
    const qp = new URLSearchParams();
    if (city) qp.set('destination', city);
    if (checkin) qp.set('checkin', checkin);
    if (checkout) qp.set('checkout', checkout);
    if (adults) qp.set('adults', adults);
    if (children && children !== '0') qp.set('children', children);
    if (rooms) qp.set('rooms', rooms);
    const qs = qp.toString();
    return qs ? `/hotels?${qs}` : '/hotels';
  }, [city, checkin, checkout, adults, children, rooms]);

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
        if (!data.success) setError(data.error || t('hotelNotFound'));
        else setHotel(data.hotel);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('networkError'));
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
    if (occ) params.set('occ', occ);
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
  }, [city, checkin, checkout, adults, children, rooms, id, occ]);

  /* Auto room-split (owner request 2026-07-14): every hotel has its own
     occupancy policy — some sell triple/quad rooms, budget ones cap at 2.
     When THIS hotel returns zero single-room offers for a 3+ party, retry
     as 2 rooms automatically instead of making the customer find the
     manual button. One attempt per (hotel × dates × party) so manually
     stepping rooms back down to 1 doesn't fight the automation. */
  const autoSplitKey = useRef<string | null>(null);

  /* Fetch the full rate table for this hotel. We pass the exact same
     search-context params as the results page used so the prices here
     match cent-for-cent with what the user clicked on. */
  useEffect(() => {
    if (!id || !checkin || !checkout) { setRatesLoading(false); return; }
    let cancelled = false;
    // Stays true when this run ends by auto-splitting into 2 rooms — the
    // URL change immediately re-runs the effect, so keep the loading UI up
    // instead of flashing the empty state in between.
    let splitting = false;
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
        if (occ) p.set('occ', occ);
        const res = await fetch(`/api/hotels/rates?${p.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && Array.isArray(data.offers)) {
          const list: RoomRate[] = data.offers;
          // Zero single-room offers for a 3+ party → this hotel's rooms
          // don't sleep that many. Re-run as 2 rooms automatically (once
          // per hotel × dates × party) — hotels WITH triple/family rooms
          // never hit this branch because their single-room offers exist.
          if (list.length === 0) {
            const adultsN = Math.max(1, parseInt(adults) || 2);
            const childCount = Math.max(0, parseInt(children) || 0);
            const roomsN = Math.max(1, parseInt(rooms) || 1);
            const splitKey = `${id}:${checkin}:${checkout}:${adults}:${children}:${childrenAges}`;
            if (adultsN + childCount > 2 && roomsN === 1 && autoSplitKey.current !== splitKey) {
              autoSplitKey.current = splitKey;
              const ages = (childrenAges || '')
                .split(',').map(Number)
                .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17)
                .slice(0, childCount);
              while (ages.length < childCount) ages.push(7);
              splitting = true;
              updateOccupancy(adultsN, ages, 2);
              return; // URL change re-runs this effect with rooms=2
            }
          }
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
        if (!cancelled && !splitting) setRatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, checkin, checkout, adults, children, rooms, currency, childrenAges, offerId, occ]);

  /* Guests & rooms steppers — rendered TWICE: in the booking sidebar
     (desktop) and directly above the rooms table (mobile-only block).
     On mobile the sidebar stacks below every other section, so without
     the top copy a phone user had to scroll past rooms + reviews + all
     hotel details just to find where to change the party (owner report
     2026-07-14; ~90% of traffic is mobile). Plain function, no hooks. */
  const renderOccupancyPicker = () => {
    const adultsN = Math.max(1, Math.min(6, parseInt(adults) || 2));
    const childCount = Math.max(0, Math.min(4, parseInt(children) || 0));
    const roomsN = Math.max(1, Math.min(3, parseInt(rooms) || 1));
    const agesFromParam = (childrenAges || '').split(',').map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
    const ages = Array.from({ length: childCount }, (_, i) => agesFromParam[i] ?? 7);
    const stepBtn = 'w-8 h-8 rounded-full border border-[#E8ECF4] bg-[#F8FAFC] hover:bg-white text-[#1A1D2B] font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors';
    return (
      <div className="rounded-xl border border-[#E8ECF4] p-3 space-y-2.5 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[.82rem] font-semibold text-[#5C6378]">{t('adults')}</span>
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label={t('fewerAdults')} className={stepBtn} disabled={adultsN <= 1}
              onClick={() => updateOccupancy(adultsN - 1, ages)}>−</button>
            <span className="w-5 text-center font-black text-[#1A1D2B]">{adultsN}</span>
            <button type="button" aria-label={t('moreAdults')} className={stepBtn} disabled={adultsN >= 6}
              onClick={() => updateOccupancy(adultsN + 1, ages)}>+</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[.82rem] font-semibold text-[#5C6378]">{t('children')}</span>
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label={t('fewerChildren')} className={stepBtn} disabled={childCount <= 0}
              onClick={() => updateOccupancy(adultsN, ages.slice(0, -1))}>−</button>
            <span className="w-5 text-center font-black text-[#1A1D2B]">{childCount}</span>
            <button type="button" aria-label={t('moreChildren')} className={stepBtn} disabled={childCount >= 4}
              onClick={() => updateOccupancy(adultsN, [...ages, 7])}>+</button>
          </div>
        </div>
        {childCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {ages.map((age, i) => (
              <label key={i} className="inline-flex items-center gap-1.5 text-[.72rem] font-bold text-[#5C6378]">
                {t('childN', { n: i + 1 })}
                <select value={age}
                  className="rounded-lg border border-[#E8ECF4] bg-[#F8FAFC] px-1.5 py-1 text-[.75rem] font-bold text-[#1A1D2B]"
                  onChange={(e) => {
                    const next = [...ages];
                    next[i] = Number(e.target.value);
                    updateOccupancy(adultsN, next);
                  }}>
                  {Array.from({ length: 18 }, (_, a) => (
                    <option key={a} value={a}>{a === 0 ? t('underOne') : a}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[.82rem] font-semibold text-[#5C6378]">{t('roomsLabel')}</span>
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label={t('fewerRooms')} className={stepBtn} disabled={roomsN <= 1}
              onClick={() => updateOccupancy(adultsN, ages, roomsN - 1)}>−</button>
            <span className="w-5 text-center font-black text-[#1A1D2B]">{roomsN}</span>
            <button type="button" aria-label={t('moreRooms')} className={stepBtn} disabled={roomsN >= 3}
              onClick={() => updateOccupancy(adultsN, ages, roomsN + 1)}>+</button>
          </div>
        </div>
        <p className="text-[.66rem] text-[#8E95A9] font-medium">{t('pricesUpdateLive')}</p>
      </div>
    );
  };

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

  /* Phase-4: resolve a rate row's room name → room metadata (photos, size,
     amenities).

     Was an exact lowercased-name Map, which matched only ~13% of rate rows
     against live LiteAPI data: /hotels/rates returns verbose names like
     "Classic Double room (full double bed) (bed type is subject to
     availability)" while /data/hotel returns "Classic Room". Every miss hid
     the "See room details & photos" button and made the modal fall back to
     the hotel gallery. createRoomResolver keeps the exact match as its fast
     path and adds token-overlap matching behind it (~69% measured).

     MUST live here (before any early return) because React's Rules of
     Hooks require every hook to be called on every render — moving it
     below the `if (loading)` / `if (error)` returns breaks hook order
     the first time the page mounts without `hotel` yet loaded. */
  const resolveRoomMeta = useMemo(
    () => createRoomResolver<RoomMeta>(hotel?.rooms || []),
    [hotel?.rooms],
  );

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
      if (!data.success) throw new Error(data.error || t('couldNotStartBooking'));
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('unexpectedError'));
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
      if (!data.success) throw new Error(data.error || t('couldNotStartBooking'));
      window.location.assign(`/hotels/checkout/${encodeURIComponent(data.ref)}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('unexpectedError'));
      setStartingBooking(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-[1100px] mx-auto px-5 pt-40 lg:pt-32 pb-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#E8ECF4] border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm font-semibold text-[#5C6378]">{t('loadingHotel')}</p>
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
            <p className="font-poppins font-bold text-red-700">{error || t('hotelNotFound')}</p>
            <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">{t('backToHotels')}</a>
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
  const modalRoomMeta = modalRate ? resolveRoomMeta(modalRate.roomName || '') : null;
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
      // intentionally omitted. Our reviews come from LiteAPI (sourced from our
      // wholesale hotel partners) and are not first-party collected. Google's
      // review-snippet policy treats third-party review arrays as spam risk.
      // Aggregate score + count is still Google-compliant and drives the
      // star-rating rich snippet.
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
      {/* Hotel's own photos as a soft backdrop — carries the chosen hotel
          visually through the detail page and on into checkout. Reuses the
          already-fetched gallery images. */}
      <HotelBackdrop photos={gallery} />
      {locOpen && hasMapCoords && (
        <HotelLocationModal
          hotelName={hotel.name}
          lat={mapLat}
          lng={mapLng}
          reference={
            Number.isFinite(refLat) && Number.isFinite(refLng)
              ? { label: refLabel || th('mapRefCentre'), lat: refLat, lng: refLng }
              : null
          }
          onClose={() => setLocOpen(false)}
        />
      )}
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
            href={backToResultsHref}
            onClick={openedInNewTab ? (e) => {
              // We were opened in a new tab from the results page, so that tab
              // is still sitting there with its scroll, page and filters
              // intact. Closing this one lands the visitor straight back on it
              // — no re-search, no second results tab. If the browser refuses
              // to close a tab its own script didn't open, we fall through to
              // the normal link after a beat (i.e. today's behaviour).
              e.preventDefault();
              window.close();
              window.setTimeout(() => { window.location.href = backToResultsHref; }, 250);
            } : undefined}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#E8ECF4] text-[.78rem] font-poppins font-bold text-[#0a1628] hover:bg-[#FCFAF5] hover:border-[#E8D8A8] shadow-[0_2px_10px_rgba(10,22,40,0.04)] transition-colors"
            aria-label={t('backToSearchAria')}
          >
            <i className="fa-solid fa-arrow-left text-[.7rem]" />
            {t('backToSearch')}{city ? ` ${t('inCity', { city })}` : ` ${t('resultsWord')}`}
          </a>
        </div>

        {/* Phase-5: Breadcrumb — Home / Hotels / {City} / {Hotel} — anchored
            left so the hotel title sits on its own line below. Uses native
            <nav> + aria-label for screen readers. */}
        <nav aria-label={t('breadcrumbAria')} className="text-[.72rem] font-semibold text-[#8E95A9]">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><a href="/" className="hover:text-[#0066FF] transition-colors">{t('home')}</a></li>
            <li aria-hidden>›</li>
            <li>
              <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="hover:text-[#0066FF] transition-colors">
                {t('hotels')}
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
                cue customers read for on every wholesale hotel listing. We
                keep it even when no rate is selected yet. */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[.68rem] font-bold">
                <i className="fa-solid fa-receipt text-[.62rem]" />
                {t('pricesInclTaxes')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF3E6] border border-[#E8D8A8] text-[#8a6d00] text-[.68rem] font-bold">
                <i className="fa-solid fa-hand-holding-dollar text-[.62rem]" />
                {t('noBookingFees')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[.68rem] font-bold">
                <i className="fa-solid fa-shield-halved text-[.62rem]" />
                {t('scoutPriceMatch')}
              </span>
              {/* "Show on map" sits in the trust-chip row so it reads as part of
                  the header, right after Scout Price Match. Opens the location
                  popup (hotel + searched reference + distance). Shows on every
                  hotel that had coords in search (see mapLat/mapLng fallback). */}
              {hasMapCoords && (
                <button
                  type="button"
                  onClick={() => setLocOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef4ff] border border-[#cfe0ff] text-[#0a58d0] text-[.68rem] font-bold hover:bg-[#e2edff] transition-colors"
                >
                  <i className="fa-solid fa-map-location-dot text-[.62rem]" aria-hidden />
                  {th('showOnMap')}
                </button>
              )}
              {/* Save sits with the other header chips so it's found at the
                  moment of deciding, not buried at the bottom of the page. */}
              <FavouriteButton
                variant="detail"
                className="!px-2.5 !py-1 !rounded-full !text-[.68rem]"
                favourite={{
                  hotelId: id,
                  name: hotel?.name || '',
                  city,
                  thumbnail: hotel?.photos?.[0],
                  stars: hotel?.stars ?? undefined,
                  savedPricePence: price ? Math.round(parseFloat(price) * 100) : undefined,
                  currency,
                  url: `/hotels/${encodeURIComponent(id)}${typeof window !== 'undefined' ? window.location.search : ''}`,
                  createdAt: Date.now(),
                }}
              />
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
                    aria-label={t('prevPhoto')}
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
                    aria-label={t('nextPhoto')}
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
            below. Mirrors the standard "Overview / Rooms / Facilities /
            Reviews / Fine print" row most hotel pages use; we keep a shorter
            Scout-voiced version so the page feels navigable from the top.
            Uses native anchor links so keyboard + screen-reader navigation
            comes for free. */}
        <nav
          aria-label={t('sectionsAria')}
          className="sticky top-[72px] z-20 -mx-5 md:-mx-0 px-5 md:px-0 py-2 bg-white/90 backdrop-blur-md border-y border-[#E8ECF4] mb-6"
        >
          <ul className="flex gap-1 overflow-x-auto text-[.78rem] font-semibold">
            <li><a href="#rooms" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">{t('navRooms')}</a></li>
            {hotel.description && (
              <li><a href="#overview" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">{t('navOverview')}</a></li>
            )}
            {hotel.amenities.length > 0 && (
              <li><a href="#facilities" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">{t('navFacilities')}</a></li>
            )}
            {typeof hotel.latitude === 'number' && typeof hotel.longitude === 'number' && (
              <li><a href="#location" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">{t('navLocation')}</a></li>
            )}
            {(hotel.checkInTime || hotel.checkOutTime) && (
              <li><a href="#policies" className="inline-block px-3 py-1.5 rounded-full hover:bg-[#FAF3E6] text-[#0a1628] transition-colors">{t('navPolicies')}</a></li>
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
                {t('navReviews')}
                {hotel.reviews && hotel.reviews.count > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[#FAF3E6] ring-1 ring-[#E8D8A8] text-[#8a6d00] text-[.66rem] font-black px-2 py-0.5 tabular-nums">
                    {hotel.reviews.count.toLocaleString()}
                  </span>
                )}
              </a>
            </li>
          </ul>
        </nav>

        {/* Apple rejected 1.3.5 under Guideline 4 (Design) after reviewing this
            page on an iPad Air 11-inch: the booking sidebar ran off the right
            edge, so "Reserve" and the guest steppers were unreachable.
            Two causes, both here:
              1. `md:` (768px) put iPad portrait (820px) into two columns, leaving
                 the rates table ~416px — room names wrapped one word per line.
                 Raised to `lg:` (1024px) so tablet portrait stays single-column.
              2. `1fr` is `minmax(auto, 1fr)`, and `auto` refuses to shrink below
                 the content's min-content width. The rates column therefore
                 pushed the grid wider than the viewport and shoved the sidebar
                 off-screen. `minmax(0,1fr)` lets it shrink. */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* Left: rates table → description → amenities */}
          <div>
            {/* ═══ Scout Rooms Table ═══
                The primary action. Rendered BEFORE description so the
                customer sees the rate choices without scrolling. */}
            <div id="rooms" className="scroll-mt-[140px]" />
            {/* Guests & rooms — mobile-only copy at the TOP of the page.
                90% of bookings come from phones, where the sidebar copy is
                buried below rooms + reviews + details (owner report 07-14). */}
            {/* Follows the grid breakpoint above: below `lg` the sidebar sits
                BELOW the rates, so the guest picker has to be offered up here or
                it is buried. Was `md:hidden`. */}
            <div className="lg:hidden mb-4">
              <div className="text-[.7rem] font-black uppercase tracking-[1px] text-[#8E95A9] mb-1.5">
                <i className="fa-solid fa-user-group text-[.65rem] mr-1.5" />
                {t('whoStaying')}
              </div>
              {renderOccupancyPicker()}
            </div>
            {ratesLoading && rates.length === 0 ? (
              <RoomsSkeleton />
            ) : rates.length > 0 ? (
              // While a party/date change refetches, keep the previous table
              // mounted (dimmed, clicks off) instead of collapsing to a short
              // skeleton — the collapse used to shrink the page and dump the
              // viewport at the footer on mobile (owner report 07-14).
              <div className={`mb-5 relative ${ratesLoading ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                {Math.max(1, parseInt(rooms) || 1) > 1 && (
                  // Multi-room quote — spell out WHY, whether the split was
                  // automatic (this hotel's rooms cap below the party) or
                  // manually picked. Every price below covers all rooms.
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[.8rem] font-semibold text-[#1A1D2B]">
                    <i className="fa-solid fa-circle-info text-[#0066FF] mt-0.5" />
                    <span>
                      {t('partyBookedPre', { party: Math.max(1, parseInt(adults) || 2) + Math.max(0, parseInt(children) || 0) })} <strong>{t('roomsBold', { rooms })}</strong> {t('partyBookedPost', { rooms })}
                    </span>
                  </div>
                )}
                {ratesLoading && (
                  <div className="absolute inset-x-0 top-3 z-10 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#0a1628] text-white text-[.75rem] font-bold px-4 py-2 shadow-lg">
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {t('updatingPrices')}
                    </span>
                  </div>
                )}
                <RoomsTable
                  offers={rates}
                  nights={numNights || 1}
                  rooms={Math.max(1, parseInt(rooms) || 1)}
                  selectedOfferId={selectedRate?.offerId || null}
                  resolveRoomMeta={resolveRoomMeta}
                  fallbackPhoto={hotel.mainPhoto || hotel.photos[0] || null}
                  onSelect={handleRowSelect}
                  onReserve={handleRowReserve}
                  onShowDetails={(oid) => setModalOfferId(oid)}
                />
              </div>
            ) : (() => {
              // Empty rates used to render nothing — a silent dead end. Most
              // common cause for bigger parties: no single room sleeps 3+, but
              // the hotel books fine as two rooms. Offer that split in one tap.
              const adultsN = Math.max(1, parseInt(adults) || 2);
              const childCount = Math.max(0, parseInt(children) || 0);
              const roomsN = Math.max(1, parseInt(rooms) || 1);
              const party = adultsN + childCount;
              const canSplit = roomsN === 1 && party > 2;
              const ages = (childrenAges || '').split(',').map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 17).slice(0, childCount);
              return (
                <div className="mb-5 bg-white border border-[#E8ECF4] rounded-2xl p-6 text-center">
                  <p className="text-[.9rem] font-bold text-[#1A1D2B] mb-1">
                    {canSplit
                      ? t('noSingleRoom', { party })
                      : t('noLiveRatesDates')}
                  </p>
                  <p className="text-[.8rem] text-[#5C6378] font-medium mb-4">
                    {canSplit
                      ? t('biggerGroups')
                      : t('tryDifferentDatesPanel')}
                  </p>
                  {canSplit && (
                    <button
                      type="button"
                      onClick={() => updateOccupancy(adultsN, ages, 2)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0066FF] px-5 py-2.5 text-[.82rem] font-black text-white hover:bg-[#0052CC] transition-colors"
                    >
                      <i className="fa-solid fa-bed" />
                      {t('search2Rooms')}
                    </button>
                  )}
                </div>
              );
            })()}

            {hotel.description && (
              <section id="overview" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">{t('aboutThisHotel')}</h2>
                <p className="text-[.88rem] text-[#5C6378] font-medium leading-relaxed whitespace-pre-line">
                  {hotel.description.slice(0, 1200)}{hotel.description.length > 1200 ? '…' : ''}
                </p>
                {googleInfo?.editorialSummary && (
                  <div className="mt-4 pt-4 border-t border-[#E8ECF4]">
                    <div className="text-[.66rem] font-black uppercase tracking-[1px] text-[#8E95A9] mb-1.5">
                      <i className="fa-brands fa-google text-[.7rem] mr-1.5" />
                      {t('googleSays')}
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
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">{t('hotelInfo')}</h2>
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
                        {t('viewGoogleMaps')}
                      </a>
                    </li>
                  )}
                  {googleInfo.openingHours && googleInfo.openingHours.length > 0 && (
                    <li className="flex items-start gap-3">
                      <i className="fa-solid fa-clock text-[#0066FF] mt-1 w-4 text-center" />
                      <div className="flex-1">
                        <div className="text-[#0a1628] font-semibold mb-1">{t('receptionHours')}</div>
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

            {hasMapCoords && (
              <section id="location" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">{t('locationTitle')}</h2>
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
                  latitude={mapLat}
                  longitude={mapLng}
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
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">{t('mostPopularFacilities')}</h2>
                <p className="text-[.74rem] text-[#8E95A9] font-semibold mb-4">
                  {t('facilitiesBody')}
                </p>
                {/* Phase-5: Amenity chip grid — each amenity gets a dedicated
                    icon drawn from HOTEL_AMENITY_ICON_MAP. Unknown amenities
                    fall back to a generic check so we never show an empty
                    square. Three columns on desktop, two on tablet, one on
                    phone — dense without feeling cramped. */}
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
                    {t('moreFacilities', { count: hotel.amenities.length - 30 })}
                  </p>
                )}
              </section>
            )}

            {(hotel.checkInTime || hotel.checkOutTime || (hotel.policies && hotel.policies.length > 0)) && (
              <section id="policies" className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5 scroll-mt-[140px]">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">{t('houseRules')}</h2>
                <p className="text-[.74rem] text-[#8E95A9] font-semibold mb-4">
                  {t('policiesBody')}
                </p>

                {/* Check-in / Check-out as a pair of champagne tiles — same
                    visual weight as the sidebar stay-schedule block so the
                    times read unambiguously. */}
                {(hotel.checkInTime || hotel.checkOutTime) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {hotel.checkInTime && (
                      <div className="rounded-xl bg-[#FAF3E6]/60 ring-1 ring-[#E8D8A8]/60 p-3.5">
                        <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-[#8a6d00] mb-1">
                          {t('checkinFrom')}
                        </div>
                        <div className="font-[var(--font-playfair)] font-black text-[1.35rem] text-[#0a1628] leading-none">
                          {hotel.checkInTime}
                        </div>
                      </div>
                    )}
                    {hotel.checkOutTime && (
                      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3.5">
                        <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-slate-500 mb-1">
                          {t('checkoutBy')}
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
                  <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-1">{t('guestReviews')}</h2>
                  <p className="text-[.74rem] text-[#8E95A9] font-semibold">
                    {t('reviewsBody')}
                  </p>
                </div>
                {hotel.reviews && typeof hotel.reviews.averageScore === 'number' && hotel.reviews.count > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-center min-w-[68px]">
                      <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-emerald-700 leading-none">
                        {hotel.reviews.averageScore.toFixed(1)}
                      </div>
                      <div className="text-[.58rem] font-black uppercase tracking-wider text-emerald-700 mt-1">
                        {t('outOf10')}
                      </div>
                    </div>
                    <div className="text-[.75rem]">
                      <div className="font-poppins font-black text-[.92rem] text-[#0a1628] leading-tight">
                        {t('score.' + scoreLabel(hotel.reviews.averageScore))}
                      </div>
                      {/* User request 2026-04-21: label "Reviews" on top, total
                          count directly underneath — two-line stack so the
                          number reads as the dominant datum. */}
                      <div className="text-[#8E95A9] font-semibold text-[.66rem] uppercase tracking-[.8px] mt-1">
                        {t('navReviews')}
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
                  // Reviews stay ON our site — no click-through to a
                  // competitor. Earlier versions linked every review card to
                  // an external search-results page (with our affiliate id
                  // preserved). That was a net loss: third-party affiliate
                  // cuts (~3-4%) are materially smaller than the LiteAPI /
                  // RateHawk / Webbeds direct commission we earn when the
                  // customer books on our own site (~5-15%), AND the trust
                  // hit of suddenly being on a competitor's domain mid-
                  // decision is real. The reviews themselves are still
                  // presented as verified — the count + "verified guest
                  // reviews" attribution at the footer of the section
                  // preserves the social-proof origin without sending
                  // traffic away. (2026-04-29, refreshed 2026-05-06)
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
                {/* BACKLOG B2 tweak (2026-04-21): review-count footer beneath
                    the list. Shows how many of the total verified reviews
                    are visible — anchors social proof at the bottom of the
                    section so the page closes on a strong number, not on
                    the last review card. */}
                <div className="mt-5 pt-4 border-t border-[#E8ECF4] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[.82rem] text-[#0a1628] font-poppins font-bold">
                    {t('showingReviewsPre', { shown: Math.min(5, hotel.reviews.list.length) })}{' '}
                    <span className="font-black">{hotel.reviews!.count.toLocaleString()}</span>{' '}
                    {t('verifiedGuestReview', { count: hotel.reviews!.count })}
                  </p>
                  {typeof hotel.reviews.averageScore === 'number' && (
                    <p className="text-[.72rem] text-[#5C6378] font-semibold">
                      <i className="fa-solid fa-shield-check text-emerald-600 mr-1.5" />
                      {t('score.' + scoreLabel(hotel.reviews.averageScore))} · {hotel.reviews.averageScore.toFixed(1)}{t('outOf10Average')}
                    </p>
                  )}
                </div>
                {/* Verified-source attribution — static, no link-out.
                    Earlier versions had a "Read all on <competitor>" CTA
                    here — removed 2026-04-29 to stop leaking traffic mid-
                    decision. The "verified guest reviews" line preserves
                    the social-proof origin without naming or linking to
                    a competitor. */}
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[.72rem] font-bold">
                  <i className="fa-solid fa-shield-halved text-[.7rem]" aria-hidden />
                  {hotel.reviews.count.toLocaleString()} {t('verifiedGuestReviewsWord')}
                </div>
                </>
                  );
                })()
              ) : (
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-5 text-center">
                  <i className="fa-solid fa-comment-dots text-[1.1rem] text-slate-400 mb-2" />
                  <p className="font-poppins font-bold text-[.86rem] text-[#0a1628] mb-1">
                    {t('noReviewsYet')}
                  </p>
                  <p className="text-[.74rem] text-[#5C6378] font-medium max-w-[380px] mx-auto">
                    {t('noReviewsBody')}
                  </p>
                </div>
              )}

              {/* Google reviews block — additive to the LiteAPI guest-review
                  set above. Only renders when Google returned at least one
                  review. Shows the aggregate Google rating + count alongside
                  the cards so the social-proof score from a different source
                  compounds. */}
              {googleInfo && googleInfo.reviews.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#E8ECF4]">
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">
                        <i className="fa-brands fa-google text-[.86rem] mr-2" />
                        {t('googleReviews')}
                      </h3>
                      <p className="text-[.72rem] text-[#8E95A9] font-semibold">
                        {t('googleReviewsBody')}
                      </p>
                    </div>
                    {typeof googleInfo.rating === 'number' && (
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-center min-w-[68px]">
                          <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-amber-700 leading-none">
                            {googleInfo.rating.toFixed(1)}
                          </div>
                          <div className="text-[.58rem] font-black uppercase tracking-wider text-amber-700 mt-1">
                            {t('outOf5')}
                          </div>
                        </div>
                        {typeof googleInfo.ratingCount === 'number' && googleInfo.ratingCount > 0 && (
                          <div className="text-[.75rem]">
                            <div className="text-[#8E95A9] font-semibold text-[.66rem] uppercase tracking-[.8px]">
                              {t('googleReviews')}
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
                    {t('googleAttribution')}
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
                {t('scoutAlert')}: {signalType.replace(/_/g, ' ')}
              </div>
            )}

            {/* Sidebar price — prefer the row the user has selected in the
                Rooms Table (so clicks feel live), fall back to the URL-param
                price when rates haven't loaded yet. */}
            {(selectedRate || price) && (
              <>
                <div className="text-[.7rem] font-bold text-[#8E95A9] uppercase tracking-wide">{t('totalFor')} {parseInt(rooms) > 1 ? t('roomsSep', { rooms }) : ''}{numNights || '—'} {t('nightWord', { count: numNights })}</div>
                {selectedRate && selectedRate.negotiatedPrice != null && selectedRate.marketPrice != null && selectedRate.negotiatedPrice < selectedRate.marketPrice ? (
                  /* Phase-3: selected row carries its own Scout Deal — show
                     ribbon + strike-through market + emerald savings line,
                     sourced from the row (not the URL params). */
                  <div className="mt-1">
                    <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">{t('scoutDeal')}</span>
                    <div className="text-[.85rem] text-[#8E95A9] font-bold line-through">
                      {currencyPrefix(currency)}{selectedRate.marketPrice.toFixed(2)}
                    </div>
                    <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none">
                      {currencyPrefix(currency)}{selectedRate.negotiatedPrice.toFixed(2)}
                    </div>
                    <div className="text-[.68rem] text-green-600 font-bold mt-0.5">
                      {t('youSave')} {currencyPrefix(currency)}{(selectedRate.marketPrice - selectedRate.negotiatedPrice).toFixed(2)}
                    </div>
                  </div>
                ) : selectedRate ? (
                  <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none mt-1">
                    {currencyPrefix(currency)}{selectedRate.totalPrice.toFixed(2)}
                  </div>
                ) : mktPrice != null && negPrice != null && negPrice < mktPrice ? (
                  <div className="mt-1">
                    <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">{t('scoutDeal')}</span>
                    <div className="text-[.85rem] text-[#8E95A9] font-bold line-through">
                      {currencyPrefix(currency)}{mktPrice.toFixed(2)}
                    </div>
                    <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none">
                      {currencyPrefix(currency)}{negPrice.toFixed(2)}
                    </div>
                    <div className="text-[.68rem] text-green-600 font-bold mt-0.5">
                      {t('youSave')} {currencyPrefix(currency)}{(mktPrice - negPrice).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="font-[var(--font-playfair)] font-black text-[2.1rem] text-[#0a1628] tracking-tight leading-none mt-1">
                    {currencyPrefix(currency)}{parseFloat(price).toFixed(2)}
                  </div>
                )}
                {/* Wholesale-rate signal — appears under the price in
                    the booking sidebar. Free-cancellation note matches
                    real LiteAPI behaviour: flexible rates carry a
                    cancellation deadline, locked rates clearly don't.
                    No comparative claims against named competitors. */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[.7rem] font-bold leading-snug">
                  <span aria-hidden="true">💰</span>
                  {t('liveWholesaleFlexible')}
                </div>
              </>
            )}
            {/* Guests & rooms — desktop copy; the mobile copy sits above the
                rooms table because this sidebar stacks below all content on
                phones. */}
            <div className="mt-4">{renderOccupancyPicker()}</div>
            <div className="mt-3 space-y-2 text-[.82rem] text-[#5C6378] font-semibold">
              {/* Editable dates — blog deep links land with default dates;
                  changing them here rewrites the URL params and the rates
                  table refetches live prices in place. The old offerId/
                  price params are dropped on change (they belong to the
                  previous dates and would show a stale price). */}
              <DateRangePicker
                start={pickDates ? pickDates.start : checkin}
                end={pickDates ? pickDates.end : checkout}
                minDate={new Date().toISOString().split('T')[0]}
                accent="orange"
                startWord={t('wordCheckin')}
                endWord={t('wordCheckout')}
                onChange={(next) => {
                  setPickDates(next);
                  if (next.start && next.end) {
                    const q = new URLSearchParams(sp?.toString() || '');
                    q.set('checkin', next.start);
                    q.set('checkout', next.end);
                    q.delete('offerId');
                    q.delete('price');
                    q.delete('negPrice');
                    q.delete('mktPrice');
                    router.replace(`/hotels/${encodeURIComponent(String(id))}?${q.toString()}`, { scroll: false });
                    setPickDates(null);
                  }
                }}
              />
              {rooms !== '1' && <div className="flex justify-between"><span>{t('roomsLabel')}</span><strong className="text-[#1A1D2B]">{rooms}</strong></div>}
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
                  {t('staySchedule')}
                </div>
                <div className="space-y-1.5 text-[.78rem]">
                  {hotel.checkInTime && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                      <span className="font-semibold text-[#0a1628]">{t('checkinFrom')} <strong>{hotel.checkInTime}</strong></span>
                    </div>
                  )}
                  {hotel.checkOutTime && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full border border-slate-400 shrink-0" aria-hidden />
                      <span className="font-medium text-slate-600">{t('checkoutBy')} <strong className="text-[#0a1628]">{hotel.checkOutTime}</strong></span>
                    </div>
                  )}
                </div>
                <p className="text-[.66rem] text-slate-500 font-medium mt-2 leading-snug">
                  {t('arrivingEarly')}
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
                        {t('freeCancellation')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.72rem] font-semibold bg-slate-50 border border-slate-200 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full border border-slate-300" aria-hidden />
                        {t('nonRefundable')}
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
                // ratesLoading too: after a date/party change the old offer is
                // still selected until fresh rates land — a fast click would
                // book the previous party size at the previous price.
                disabled={startingBooking || ratesLoading}
                className="w-full mt-5 bg-[#0a1628] hover:bg-[#0066FF] disabled:opacity-60 text-white font-poppins font-bold text-[.92rem] py-3.5 rounded-xl transition-all shadow-[0_6px_22px_rgba(10,22,40,0.22)] flex items-center justify-center gap-2"
              >
                {startingBooking || ratesLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {startingBooking ? t('starting') : t('updatingPrice')}
                  </>
                ) : (
                  <><i className="fa-solid fa-lock text-[.78rem]" /> {t('reserveWithScout')}</>
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
                {t('searchDatesToBook')}
              </a>
            )}
            <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">{t('secureCheckoutNote')}</p>
          </aside>
        </div>

        {/* ── Similar Hotels ── */}
        {(similarLoading || similarHotels.length > 0) && (
          <section className="mt-10">
            <h2 className="font-poppins font-black text-[1.3rem] text-[#1A1D2B] mb-5">
              {t('moreHotelsIn', { city: city || t('thisArea') })}
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
                            <span className="text-[.6rem] text-[#8E95A9] font-semibold">{t('fromWord')} </span>
                            <span className="font-poppins font-black text-[1.2rem] text-[#1A1D2B] leading-none">
                              £{Math.round(sh.pricePerNight)}
                            </span>
                            <span className="text-[.6rem] text-[#8E95A9] font-semibold">{t('perNight')}</span>
                          </div>
                          <span className="text-[#0066FF] text-[.68rem] font-bold group-hover:translate-x-0.5 transition-transform">
                            {t('viewArrow')}
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
          Hidden on lg+ where the sidebar stays in view. Tracks the grid
          breakpoint above: below lg the sidebar sits under the rates, so this
          pinned CTA is the only always-reachable way to book — which is exactly
          what Apple found missing on iPad. Was `md:hidden`. */}
      {(selectedRate || offerId) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[150] bg-white/98 backdrop-blur-md border-t border-[#E8ECF4] shadow-[0_-8px_24px_rgba(10,22,40,0.12)] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[.58rem] font-semibold text-slate-500 uppercase tracking-[1.5px]">
              {t('totalFor')} {parseInt(rooms) > 1 ? t('roomsSep', { rooms }) : ''}{numNights || '—'} {t('nightWord', { count: numNights })}
            </div>
            <div className="font-[var(--font-playfair)] font-black text-[1.4rem] text-[#0a1628] leading-none">
              {currencyPrefix(currency)}
              {selectedRate ? selectedRate.totalPrice.toFixed(2) : (price ? parseFloat(price).toFixed(2) : '—')}
            </div>
            {selectedRate?.excludedTaxes != null && selectedRate.excludedTaxes > 0 && (
              <div className="text-[.62rem] font-medium text-slate-500 mt-0.5">
                + £{Math.round(selectedRate.excludedTaxes)} {t('cityTaxAtProperty')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedRate) handleRowReserve(selectedRate.offerId);
              else handleBook();
            }}
            disabled={startingBooking || ratesLoading}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#0a1628] hover:bg-[#0066FF] disabled:opacity-60 text-white font-poppins font-bold text-[.82rem] rounded-full px-5 py-3 shadow-[0_8px_18px_rgba(10,22,40,0.25)] transition-all"
          >
            {startingBooking || ratesLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><i className="fa-solid fa-lock text-[.72rem]" /> {t('reserveShort')}</>
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
        rooms={Math.max(1, parseInt(rooms) || 1)}
        currency={currency}
        boardLabel={modalBoardLabel}
        refundable={modalRate?.refundable ?? null}
        excludedTaxes={modalRate?.excludedTaxes ?? null}
        reserving={startingBooking}
        fallbackPhotos={gallery}
      />

      <Footer />
    </>
  );
}
