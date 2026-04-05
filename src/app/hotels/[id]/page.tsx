'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

  // Search context passed from /hotels results (for the Book button)
  const offerId = sp?.get('offerId') || '';
  const checkin = sp?.get('checkin') || '';
  const checkout = sp?.get('checkout') || '';
  const adults = sp?.get('adults') || '2';
  const children = sp?.get('children') || '0';
  const rooms = sp?.get('rooms') || '1';
  const price = sp?.get('price') || '';
  const currency = sp?.get('currency') || 'GBP';
  const city = sp?.get('city') || '';

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
            <p className="font-[Poppins] font-bold text-red-700">{error || 'Hotel not found'}</p>
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
          <h1 className="font-[Poppins] font-black text-[2rem] md:text-[2.4rem] text-[#1A1D2B] leading-tight mt-1">{hotel.name}</h1>
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
                <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-3">About this hotel</h2>
                <p className="text-[.88rem] text-[#5C6378] font-medium leading-relaxed whitespace-pre-line">
                  {hotel.description.slice(0, 1200)}{hotel.description.length > 1200 ? '…' : ''}
                </p>
              </section>
            )}

            {hotel.amenities.length > 0 && (
              <section className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-5">
                <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-3">Amenities</h2>
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
                <h2 className="font-[Poppins] font-black text-[1.1rem] text-[#1A1D2B] mb-3">Check-in / Check-out</h2>
                <div className="flex gap-6 text-[.85rem] text-[#5C6378] font-semibold">
                  {hotel.checkInTime && <div>Check-in from <strong className="text-[#1A1D2B]">{hotel.checkInTime}</strong></div>}
                  {hotel.checkOutTime && <div>Check-out by <strong className="text-[#1A1D2B]">{hotel.checkOutTime}</strong></div>}
                </div>
              </section>
            )}
          </div>

          {/* Right: booking summary */}
          <aside className="bg-white border border-[#E8ECF4] rounded-2xl p-6 h-fit sticky top-24">
            {price && (
              <>
                <div className="text-[.7rem] font-bold text-[#8E95A9] uppercase tracking-wide">Total for {numNights || '—'} night{numNights !== 1 ? 's' : ''}</div>
                <div className="font-[Poppins] font-black text-[2rem] text-[#1A1D2B] leading-none mt-1">
                  {currency === 'GBP' ? '£' : `${currency} `}{parseFloat(price).toFixed(2)}
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

            {offerId ? (
              <button
                type="button"
                onClick={handleBook}
                disabled={startingBooking}
                className="w-full mt-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-[Poppins] font-black text-[.9rem] py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
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
                className="block text-center w-full mt-5 bg-orange-500 hover:bg-orange-600 text-white font-[Poppins] font-black text-[.9rem] py-3.5 rounded-xl transition-all"
              >
                Search dates to book
              </a>
            )}
            <p className="text-[.65rem] text-[#8E95A9] font-semibold text-center mt-2">Secure checkout · Free cancellation on most rates</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
