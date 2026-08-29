/**
 * /account/bookings/[id] — one booking, opened.
 *
 * The owner's ask (2026-08-30, comparing us with a large OTA's app): "the
 * Customer can see their Booking there but they cannot open them ... I can
 * click on the Booking and Booking open up. It says the amount and says the
 * address and all the details." This is that page: amount, address,
 * directions, room, meal plan, party, times, references — for active, past
 * AND cancelled bookings alike. A record is a record.
 *
 * Ownership: same session-cookie auth as the list page, and the booking must
 * belong to the signed-in email. A miss on either renders the same 404 — a
 * guessed ref must not confirm that a booking exists.
 *
 * Every detail field is optional and simply omitted when the record predates
 * it (anything written before 2026-08-28 has none of them). The page must
 * read cleanly on the owner's very first booking and on one made today.
 */
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { readSessionEmailFromCookies } from '@/lib/session';
import { getBooking, fmtGbp, fmtDate, statusColor, type Booking } from '@/lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function partyLine(b: Booking): string {
  const a = Math.max(0, b.adults || 0);
  const c = Math.max(0, b.children || 0);
  if (!a && !c) return b.guests ? String(b.guests) : '';
  const ages = Array.isArray(b.childAges) && b.childAges.length ? ` (${b.childAges.join(', ')})` : '';
  return [
    `${a} adult${a === 1 ? '' : 's'}`,
    ...(c > 0 ? [`${c} child${c === 1 ? '' : 'ren'}${ages}`] : []),
  ].join(' + ');
}

function address(b: Booking): string {
  // Street first; city/country only when the street line does not already
  // contain them (LiteAPI writes the city into the street).
  const street = (b.hotelAddress || '').trim();
  const parts = [street];
  for (const extra of [b.hotelCity, b.hotelCountry]) {
    const e = (extra || '').trim();
    if (!e || e.length === 2) continue; // bare ISO code reads worse than nothing
    const re = new RegExp(`(^|[\\s,])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,]|$)`, 'i');
    if (!re.test(street)) parts.push(e);
  }
  return parts.filter(Boolean).join(', ');
}

function directionsUrl(b: Booking): string | null {
  if (typeof b.lat === 'number' && typeof b.lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
  }
  const q = [b.title, address(b)].filter(Boolean).join(', ').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-[#F1F3F7] last:border-0">
      <span className="text-[.8rem] text-[#5C6378] font-semibold shrink-0">{label}</span>
      <span className={`text-[.85rem] text-right ${strong ? 'font-extrabold text-[#0a1628]' : 'font-semibold text-[#1A1D2B]'}`}>
        {value}
      </span>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const email = await readSessionEmailFromCookies(cookieStore);
  if (!email) redirect('/account');

  const { id } = await params;
  const b = await getBooking(decodeURIComponent(id).slice(0, 40)).catch(() => null);
  if (!b || (b.customerEmail || '').toLowerCase() !== email) notFound();

  const addr = address(b);
  const directions = directionsUrl(b);
  const party = partyLine(b);
  const rebookCity = (b.hotelCity || '').trim() || (b.destination || '').trim();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F8FAFC] pt-28 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <Link
            href="/account/bookings"
            className="inline-flex items-center gap-2 text-[.8rem] font-bold text-[#5C6378] hover:text-[#0a1628] mb-4"
          >
            <i className="fa-solid fa-arrow-left text-[.7rem]" />
            All bookings
          </Link>

          {/* Header card: what and where, with the status worn openly —
              a cancelled booking opens just like a live one. */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[.62rem] font-black uppercase tracking-[1.8px] text-[#8a6d00] mb-1">
                  {b.type}
                </p>
                <h1 className="font-[var(--font-playfair)] font-black text-[1.5rem] text-[#0a1628] tracking-tight leading-tight">
                  {b.title}
                </h1>
              </div>
              <span className={`inline-block px-2.5 py-1 rounded-full text-[.64rem] font-black uppercase tracking-[1.2px] border ${statusColor(b.status)}`}>
                {b.status}
              </span>
            </div>

            {addr ? (
              <p className="text-[.85rem] text-[#5C6378] font-semibold mt-2">
                <i className="fa-solid fa-location-dot text-[.75rem] text-[#287DFA] mr-1.5" />
                {addr}
              </p>
            ) : b.destination ? (
              <p className="text-[.85rem] text-[#5C6378] font-semibold mt-2">
                <i className="fa-solid fa-location-dot text-[.75rem] text-[#287DFA] mr-1.5" />
                {b.destination}
              </p>
            ) : null}

            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#D6E2FF] bg-[#F1F5FF] px-4 py-2 text-[.8rem] font-extrabold text-[#0066FF]"
              >
                <i className="fa-solid fa-diamond-turn-right" />
                Get directions
              </a>
            )}
          </div>

          {/* The stay */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mt-4 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
            <p className="text-[.62rem] font-black uppercase tracking-[1.8px] text-[#8E95A9] mb-2">Your stay</p>
            <Row label="Check-in" value={`${fmtDate(b.checkIn)}${b.checkInTime ? ` from ${b.checkInTime}` : ''}`} />
            <Row label="Check-out" value={`${fmtDate(b.checkOut)}${b.checkOutTime ? ` until ${b.checkOutTime}` : ''}`} />
            {b.roomName ? <Row label="Room" value={b.roomName} /> : null}
            {b.boardName ? <Row label="Meals" value={b.boardName} /> : null}
            {party ? <Row label="Guests" value={party} /> : null}
            {b.customerName && b.customerName.toLowerCase() !== 'guest' ? (
              <Row label="Room held under" value={b.customerName} />
            ) : null}
          </div>

          {/* The money — the number he paid, and the number the desk asks for. */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mt-4 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
            <p className="text-[.62rem] font-black uppercase tracking-[1.8px] text-[#8E95A9] mb-2">Payment</p>
            <Row label="Total paid" value={fmtGbp(b.totalPence)} strong />
            {typeof b.localFeesPence === 'number' && b.localFeesPence > 0 ? (
              <>
                <Row label="Payable at the hotel" value={fmtGbp(b.localFeesPence)} />
                <p className="text-[.72rem] text-[#8E95A9] mt-1">
                  City tax and local fees the property collects on arrival — not part of the total above.
                </p>
              </>
            ) : null}
          </div>

          {/* References — the numbers reception and support actually use. */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mt-4 shadow-[0_4px_24px_rgba(10,22,40,0.04)]">
            <p className="text-[.62rem] font-black uppercase tracking-[1.8px] text-[#8E95A9] mb-2">References</p>
            <Row label="Booking ref" value={b.id} />
            {b.supplierRef ? <Row label="Hotel reference" value={b.supplierRef} /> : null}
            <Row label="Booked on" value={fmtDate(b.createdAt.slice(0, 10))} />
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {rebookCity && (
              <Link
                href={`/hotels?city=${encodeURIComponent(rebookCity)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-[.82rem] font-extrabold text-white"
              >
                <i className="fa-solid fa-rotate-right text-[.72rem]" />
                Book {rebookCity} again
              </Link>
            )}
            <a
              href={`mailto:contact@jetmeaway.co.uk?subject=${encodeURIComponent(`Booking ${b.id}`)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E8ECF4] bg-white px-5 py-2.5 text-[.82rem] font-extrabold text-[#5C6378]"
            >
              <i className="fa-regular fa-envelope text-[.72rem]" />
              Need help with this booking?
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
