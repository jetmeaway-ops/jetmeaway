'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirectUrl } from '@/lib/redirect';

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
            <a href="/hotels" className="inline-block mt-4 text-sm font-bold text-[#0066FF] underline">← Back to hotels</a>
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
        <a href="/hotels" className="text-[.78rem] font-bold text-orange-500 hover:underline">← Back to search</a>

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
          {/* Left: description + amenities */}
          <div>
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

          {/* Right: booking summary */}
          <aside className="bg-white border border-[#E8ECF4] rounded-2xl p-6 h-fit sticky top-24">
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

            {price && (
              <>
                <div className="text-[.7rem] font-bold text-[#8E95A9] uppercase tracking-wide">Total for {numNights || '—'} night{numNights !== 1 ? 's' : ''}</div>
                {/* Scout Deal — show market price crossed out */}
                {mktPrice != null && negPrice != null && negPrice < mktPrice ? (
                  <div className="mt-1">
                    <span className="inline-block text-[.55rem] font-black uppercase tracking-[1.2px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full mb-1">Scout Deal</span>
                    <div className="text-[.85rem] text-[#8E95A9] font-bold line-through">
                      {currency === 'GBP' ? '£' : `${currency} `}{mktPrice.toFixed(2)}
                    </div>
                    <div className="font-poppins font-black text-[2rem] text-[#1A1D2B] leading-none">
                      {currency === 'GBP' ? '£' : `${currency} `}{negPrice.toFixed(2)}
                    </div>
                    <div className="text-[.68rem] text-green-600 font-bold mt-0.5">
                      You save {currency === 'GBP' ? '£' : `${currency} `}{(mktPrice - negPrice).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="font-poppins font-black text-[2rem] text-[#1A1D2B] leading-none mt-1">
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

            {/* Refundable / Board type badges */}
            {(refundable !== null || boardType) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {refundable !== null && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.75rem] font-bold ${refundable ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    <i className={`fa-solid ${refundable ? 'fa-circle-check' : 'fa-circle-xmark'} text-[.65rem]`} />
                    {refundable ? 'Free cancellation' : 'Non-refundable'}
                  </span>
                )}
                {boardType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[.75rem] font-bold bg-blue-50 border border-blue-200 text-blue-700">
                    <i className="fa-solid fa-utensils text-[.65rem]" />
                    {boardType}
                  </span>
                )}
              </div>
            )}

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

            {offerId ? (
              <button
                type="button"
                onClick={handleBook}
                disabled={startingBooking}
                className="w-full mt-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-poppins font-black text-[.9rem] py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
              >
                {startingBooking ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <><i className="fa-solid fa-lock text-[.8rem]" /> Book Direct</>
                )}
              </button>
            ) : (
              <a
                href="/hotels"
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
