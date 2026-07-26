import { NextRequest, NextResponse } from 'next/server';
import { kyteCertAllowed } from '@/lib/kyte-access';
import {
  newKyteContext,
  shopFlights,
  offerDetails,
  bookFlight,
  payBooking,
  retrieveBooking,
  type Cabin,
  type KyteShopRequest,
  type KytePassenger,
  type KytePaymentRequest,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/cert-run   (Kyte certification — standard LCC flow)

   Runs the FULL sandbox lifecycle for one non-Ryanair carrier and returns a
   step-by-step log, so Kyte can confirm the whole integration works per
   carrier from the private /kyte-cert page:

     Shop → OfferDetails → Book → Payment → Retrieve (PNR)

   Ryanair is NOT handled here — it uses the OTA iframe/commit path (DemoClient).

   Token-gated (kyteCertAllowed): only the /kyte-cert page (x-kyte-cert header)
   or a global KYTE_ENABLED=true can reach it. Customers never do.

   Sandbox ONLY: hardcoded sandbox test passenger + the documented sandbox test
   card (visa-debit) — NO real money, NO Stripe, NO PII from any user. Logs are
   scrubbed to ids/status/amounts only.

   ⚠ Node runtime — Kyte needs undici.ProxyAgent (Fixie static IPs), not Edge.
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 60;

type Step = { name: string; ok: boolean; ms: number; note: string };

type Body = {
  carrier?: string; // IATA airline code, e.g. 'LS' (Jet2)
  from?: string;
  to?: string;
  departure?: string; // optional YYYY-MM-DD; defaults to +45d
};

// Sandbox test traveller — NOT real user data.
const PAX = {
  firstName: 'Sandbox',
  lastName: 'Tester',
  gender: 'male' as const,
  title: 'mr' as const,
  dateOfBirth: '1990-01-15',
  contactInformation: {
    email: 'sandbox-test@jetmeaway.co.uk',
    phone: [{ countryCode: '+44', number: '7700900000', type: 'Mobile' }],
  },
};

// Documented Kyte/Ryanair sandbox test card (visa-debit). Sandbox only.
const TEST_CARD = {
  number: '4539795097006388',
  cardholderName: 'Sandbox Tester',
  valid: { month: 10, year: 30 },
  security: '747',
  type: 'visa-debit' as const,
  isCorporate: false,
  address: {
    addressLines: ['66 Paul Street'],
    city: 'London',
    postalCode: 'EC2A 4NA',
    countryCode: 'GB',
  },
};

export async function POST(req: NextRequest) {
  if (!kyteCertAllowed(req)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const carrier = (body.carrier || '').toUpperCase().trim();
  const from = (body.from || '').toUpperCase().trim();
  const to = (body.to || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{2}$/.test(carrier)) {
    return NextResponse.json({ error: 'carrier must be a 2-char IATA code' }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return NextResponse.json({ error: 'from/to must be IATA-3 codes' }, { status: 400 });
  }
  const departure =
    body.departure && /^\d{4}-\d{2}-\d{2}$/.test(body.departure)
      ? body.departure
      : (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() + 45);
          return d.toISOString().slice(0, 10);
        })();

  const steps: Step[] = [];
  const ctx = newKyteContext();
  let bookingId = '';
  let pnr = '';

  async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    const t0 = Date.now();
    try {
      const out = await fn();
      steps.push({ name, ok: true, ms: Date.now() - t0, note: '' });
      return out;
    } catch (err) {
      steps.push({
        name,
        ok: false,
        ms: Date.now() - t0,
        note: (err as Error).message.slice(0, 160),
      });
      return null;
    }
  }

  // ── 1. Shop ────────────────────────────────────────────────────────────────
  const shopReq: KyteShopRequest = {
    journeys: [{ departureAirport: from, arrivalAirport: to, date: { main: departure } }],
    cabinType: 'economy' as Cabin,
    nonStopFlight: true,
    exactMatch: true,
    flexibility: 'lowest',
    passengers: [{ age: 30 }],
  };
  const shop = await step('Shop', () => shopFlights(shopReq, ctx, { airlines: carrier }));
  const offersObj =
    shop && typeof shop === 'object' ? ((shop as { offers?: Record<string, unknown> }).offers || {}) : {};
  const offerEntries = Object.entries(offersObj);
  if (!offerEntries.length) {
    steps.push({
      name: 'Offers',
      ok: false,
      ms: 0,
      note: `no offers for ${carrier} ${from}-${to} on ${departure} — try another route/date`,
    });
    return NextResponse.json({ ok: false, carrier, route: `${from}-${to}`, departure, steps });
  }
  const [offerId, offerRaw] = offerEntries[0] as [string, Record<string, unknown>];
  steps.push({ name: 'Offers', ok: true, ms: 0, note: `${offerEntries.length} offer(s)` });

  // Passenger ids the offer assigned (carriers reject Book if not echoed).
  const paxIds =
    (Array.isArray(offerRaw.passengers) ? (offerRaw.passengers as Array<{ id?: string }>) : [])
      .map((p) => p.id)
      .filter((x): x is string => !!x);
  const ids = paxIds.length ? paxIds : ['P1'];

  // ── 2. OfferDetails ─────────────────────────────────────────────────────────
  await step('OfferDetails', () => offerDetails([offerId], ctx));

  // ── 3. Book ─────────────────────────────────────────────────────────────────
  const passengers: KytePassenger[] = ids.map((id) => ({ id, ...PAX }));
  const book = await step('Book', () => bookFlight(offerId, passengers, ctx));
  if (book && typeof book === 'object') {
    const b = book as Record<string, unknown>;
    bookingId = String(b.id ?? b.bookingId ?? (b.booking as Record<string, unknown>)?.id ?? '');
  }
  if (!bookingId) {
    steps.push({ name: 'BookingId', ok: false, ms: 0, note: 'no booking id in Book response' });
    return NextResponse.json({ ok: false, carrier, route: `${from}-${to}`, departure, steps });
  }
  const balance =
    (book as Record<string, unknown>)?.currentBalance ??
    (book as Record<string, unknown>)?.totalAmount ??
    0;

  // ── 4. Payment (sandbox test card) ──────────────────────────────────────────
  const payment: KytePaymentRequest = {
    method: 'card',
    amount: Number(balance) || 0,
    creditCardInfo: [{ ...TEST_CARD, owner: ids[0] }],
    payerInformation: [
      {
        id: ids[0],
        firstName: PAX.firstName,
        lastName: PAX.lastName,
        title: PAX.title,
        contactInformation: PAX.contactInformation,
      },
    ],
    transactionType: 'moto', // bypasses the 3DS challenge in sandbox (Transavia)
  };
  const pay = await step('Payment', () => payBooking(bookingId, payment, ctx));
  const payStatus =
    pay && typeof pay === 'object' ? String((pay as { status?: unknown }).status ?? '') : '';
  if (payStatus && payStatus !== 'ok') {
    steps[steps.length - 1].note = `status=${payStatus}`;
  }

  // ── 5. Retrieve (PNR) ───────────────────────────────────────────────────────
  const ret = await step('Retrieve', () =>
    retrieveBooking(
      bookingId,
      { forceRefresh: true, requestedInfo: ['PNR', 'passengerDetails', 'ticketInfo', 'itinerary'] },
      ctx,
    ),
  );
  if (ret && typeof ret === 'object') {
    const r = ret as Record<string, unknown>;
    pnr = String(
      r.pnr ??
        r.PNR ??
        (r.booking as Record<string, unknown>)?.pnr ??
        (r.reservation as Record<string, unknown>)?.pnr ??
        '',
    );
  }

  const ok = steps.every((s) => s.ok);
  return NextResponse.json({
    ok,
    carrier,
    route: `${from}-${to}`,
    departure,
    bookingRef: bookingId ? `${bookingId.slice(0, 20)}…` : null,
    pnr: pnr || null,
    paymentStatus: payStatus || null,
    steps,
  });
}
