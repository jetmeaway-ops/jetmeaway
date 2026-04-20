'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';
import RoomsTable, { type RoomRate } from './RoomsTable';
import RoomsSkeleton from './RoomsSkeleton';

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
}

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

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const id = params?.id || '';

  const [hotel, setHotel] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
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
  }, [id]);

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

  /* Row Reserve click — delegate to the existing handleBook using the
     selected rate's offerId/price/board so the checkout sees the exact
     row the user clicked, not the URL-param offer. */
  const handleRowReserve = async (rowOfferId: string) => {
    const rate = rates.find((r) => r.offerId === rowOfferId);
    if (!rate || !hotel) return;
    setSelectedRate(rate);
    setStartingBooking(true);
    try {
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
          rooms: parseInt(rooms),
          totalPrice: rate.totalPrice,
          currency,
          localFees: localFees || 0,
          refundable: rate.refundable,
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

  const handleBook = async () => {
    if (!offerId || !hotel) return;
    setStartingBooking(true);
    try {
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
        <main className="max-w-[1100px] mx-auto px-5 pt-32 pb-16 text-center">
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
        <main className="max-w-[1100px] mx-auto px-5 pt-32 pb-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="font-poppins font-bold text-red-700">{error || 'Hotel not found'}</p>
            <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const gallery = hotel.photos.length > 0 ? hotel.photos : (hotel.mainPhoto ? [hotel.mainPhoto] : []);
  const mainImg = gallery[activePhoto] || hotel.mainPhoto;

  const numNights = checkin && checkout
    ? Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 0;

  return (
    <>
      <Header />
      <main className="max-w-[1100px] mx-auto px-5 pt-28 pb-16">
        <a href={city ? `/hotels?destination=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}` : '/hotels'} className="text-[.78rem] font-bold text-orange-500 hover:underline">← Back to search</a>

        {/* Header */}
        <div className="mt-3 mb-5">
          <Stars count={hotel.stars} />
          <h1 className="font-poppins font-black text-[2rem] md:text-[2.4rem] text-[#1A1D2B] leading-tight mt-1">{hotel.name}</h1>
          {hotel.address && (
            <p className="text-[.85rem] text-[#5C6378] font-semibold mt-1">📍 {hotel.address}{hotel.city ? `, ${hotel.city}` : ''}</p>
          )}
        </div>

        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="mb-6">
            <div className="w-full h-[280px] md:h-[460px] rounded-2xl overflow-hidden bg-[#F1F3F7]">
              {mainImg && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={mainImg} alt={hotel.name} className="w-full h-full object-cover" />
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {gallery.slice(0, 12).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? 'border-orange-500' : 'border-transparent'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_340px] gap-6">
          {/* Left: rates table → description → amenities */}
          <div>
            {/* ═══ Scout Rooms Table ═══
                The primary action. Rendered BEFORE description so the
                customer sees the rate choices without scrolling. */}
            {ratesLoading ? (
              <RoomsSkeleton />
            ) : rates.length > 0 ? (
              <div className="mb-5">
                <RoomsTable
                  offers={rates}
                  nights={numNights || 1}
                  selectedOfferId={selectedRate?.offerId || null}
                  onSelect={handleRowSelect}
                  onReserve={handleRowReserve}
                />
              </div>
            ) : null}

            {hotel.description && (
              <section className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">About this hotel</h2>
                <p className="text-[.88rem] text-[#5C6378] font-medium leading-relaxed whitespace-pre-line">
                  {hotel.description.slice(0, 1200)}{hotel.description.length > 1200 ? '…' : ''}
                </p>
              </section>
            )}

            {hotel.amenities.length > 0 && (
              <section className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">Amenities</h2>
                <div className="grid grid-cols-2 gap-2">
                  {hotel.amenities.slice(0, 24).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-[.82rem] text-[#5C6378] font-semibold">
                      <i className="fa-solid fa-check text-green-500 text-[.7rem]" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(hotel.checkInTime || hotel.checkOutTime) && (
              <section className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5">
                <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-3">Check-in / Check-out</h2>
                <div className="flex gap-6 text-[.85rem] text-[#5C6378] font-semibold">
                  {hotel.checkInTime && <div>Check-in from <strong className="text-[#1A1D2B]">{hotel.checkInTime}</strong></div>}
                  {hotel.checkOutTime && <div>Check-out by <strong className="text-[#1A1D2B]">{hotel.checkOutTime}</strong></div>}
                </div>
              </section>
            )}
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
      <Footer />
    </>
  );
}
