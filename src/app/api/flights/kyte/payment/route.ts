import { NextRequest, NextResponse } from 'next/server';
import {
  payBooking,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type KyteCard,
  type KytePayer,
  type KytePaymentRequest,
  type Title,
} from '@/lib/kyte';
import { upsertBooking, type Booking } from '@/lib/bookings';
import { notifyBookingConfirmed } from '@/lib/notifications';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/payment

   Step 3 of 3 (pre-retrieval) in the Kyte sandbox booking flow.

   ⚠ Node runtime.
   ⚠ RAW CARD DATA IN BODY — this endpoint sees PAN + CVV.
     - NEVER log the request body
     - NEVER persist card details
     - NEVER return card details to the client beyond status
     - Sandbox-only for Phase 3. For production: hosted payment page,
       VGS/Spreedly vault, or SAQ-A-EP card form must be chosen first.
   ⚠ TODO before production: PCI compliance pathway, session auth.

   Body:
     {
       transactionId, bookingId, amount,
       card: { number, cardholderName, expMonth, expYear, cvv, type,
               address: { addressLines, city, postalCode, countryCode } },
       payer: { firstName, lastName, title, email, phone: { countryCode, number } },
       transactionType?: 'moto',
       codegen?: boolean
     }

   Response (200): { status }
   Response (4xx/5xx): { error }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = {
  transactionId?: string;
  bookingId?: string;
  amount?: number;
  card?: {
    number?: string;
    cardholderName?: string;
    expMonth?: number;
    expYear?: number;
    cvv?: string;
    type?: KyteCard['type'];
    address?: {
      addressLines?: string[];
      city?: string;
      postalCode?: string;
      countryCode?: string;
    };
  };
  payer?: {
    firstName?: string;
    lastName?: string;
    title?: Title;
    email?: string;
    phone?: { countryCode?: string; number?: string };
  };
  transactionType?: 'moto';
  codegen?: boolean;
  /**
   * Optional booking metadata. If present AND payment succeeds, we
   * upsert a Booking row to `bookings:all` so it appears in /admin and
   * is retrievable by phone via the IVR. Absent = payment-only call,
   * no persistence (back-compat with the original Phase 3 smoke).
   */
  tripContext?: {
    destination?: string;
    departureDate?: string;
    returnDate?: string | null;
    passengerCount?: number;
    title?: string;
  };
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const transactionId = (body.transactionId || '').trim();
  const bookingId = (body.bookingId || '').trim();
  const amount = Number(body.amount);
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const c = body.card || {};
  const number = (c.number || '').replace(/\s+/g, '');
  const cvv = (c.cvv || '').trim();
  const cardholderName = (c.cardholderName || '').trim();
  if (!number || !cvv || !cardholderName) {
    return NextResponse.json(
      { error: 'card.number, card.cvv, card.cardholderName are required' },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(c.expMonth) ||
    (c.expMonth as number) < 1 ||
    (c.expMonth as number) > 12 ||
    !Number.isInteger(c.expYear) ||
    (c.expYear as number) < 0 ||
    (c.expYear as number) > 99
  ) {
    return NextResponse.json(
      { error: 'card.expMonth (1-12) and card.expYear (2-digit) are required' },
      { status: 400 },
    );
  }
  if (!c.type) {
    return NextResponse.json({ error: 'card.type is required' }, { status: 400 });
  }
  const a = c.address || {};
  if (
    !a.city ||
    !a.postalCode ||
    !a.countryCode ||
    !Array.isArray(a.addressLines) ||
    a.addressLines.length === 0
  ) {
    return NextResponse.json(
      { error: 'card.address requires addressLines, city, postalCode, countryCode' },
      { status: 400 },
    );
  }

  const p = body.payer || {};
  if (
    !p.firstName ||
    !p.lastName ||
    !p.title ||
    !p.email ||
    !p.phone?.countryCode ||
    !p.phone?.number
  ) {
    return NextResponse.json(
      { error: 'payer requires firstName, lastName, title, email, phone' },
      { status: 400 },
    );
  }

  const cardOwner = '1';
  const card: KyteCard = {
    number,
    cardholderName,
    valid: { month: c.expMonth as number, year: c.expYear as number },
    security: cvv,
    type: c.type,
    isCorporate: false,
    address: {
      addressLines: a.addressLines!,
      city: a.city!,
      postalCode: a.postalCode!,
      countryCode: a.countryCode!,
    },
    owner: cardOwner,
  };

  const payer: KytePayer = {
    id: cardOwner,
    firstName: p.firstName!,
    lastName: p.lastName!,
    title: p.title!,
    contactInformation: {
      email: p.email!,
      phone: [{ countryCode: p.phone!.countryCode!, number: p.phone!.number!, type: 'Home' }],
    },
  };

  const payment: KytePaymentRequest & { transactionType?: 'moto'; codegen?: boolean } = {
    method: 'card',
    amount,
    creditCardInfo: [card],
    payerInformation: [payer],
  };
  if (body.transactionType === 'moto') payment.transactionType = 'moto';
  if (body.codegen === true) payment.codegen = true;

  try {
    const res = await payBooking(bookingId, payment as KytePaymentRequest, { transactionId });
    const status = res.status ?? 'unknown';

    let internalBookingId: string | undefined;
    if (status === 'ok' && body.tripContext) {
      internalBookingId = await persistBooking(body, bookingId, amount);
    }

    return NextResponse.json({ status, internalBookingId });
  } catch (e) {
    return mapError(e);
  }
}

/**
 * Write a confirmed Booking row to `bookings:all`. KV write failure is
 * logged but does NOT fail the route — the payment already succeeded on
 * Kyte's side, and a missing KV row is less bad than telling the caller
 * the payment failed (which would cause them to retry).
 */
async function persistBooking(
  body: Body,
  kyteBookingId: string,
  amount: number,
): Promise<string | undefined> {
  const ctx = body.tripContext!;
  const payer = body.payer!;
  const tripTitle =
    ctx.title || `Kyte flight booking (${ctx.passengerCount ?? 1} pax)`;
  const customerPhone =
    payer.phone?.countryCode && payer.phone?.number
      ? `${payer.phone.countryCode}${payer.phone.number}`
      : null;

  const internalId = `JMA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const record: Booking = {
    id: internalId,
    type: 'flight',
    supplier: 'kyte',
    supplierRef: kyteBookingId,
    status: 'confirmed',
    customerName: `${payer.firstName} ${payer.lastName}`.trim() || 'Guest',
    customerEmail: payer.email!,
    customerPhone,
    destination: ctx.destination || '',
    checkIn: ctx.departureDate || null,
    checkOut: ctx.returnDate || null,
    guests: ctx.passengerCount ?? 1,
    title: tripTitle,
    totalPence: amount,
    netPence: 0,
    marginPence: 0,
    stripePaymentId: null,
    paymentStatus: 'paid',
    createdAt: now,
    updatedAt: now,
    notes: null,
  };

  try {
    await upsertBooking(record);
    // Fire-and-forget — never block the HTTP response on email/SMS delivery.
    // Matches the existing Duffel/LiteAPI confirmation pattern in
    // /api/flights/book and /api/hotels/book.
    notifyBookingConfirmed(record).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[kyte/payment] notifyBookingConfirmed failed', (err as Error).message);
    });
    return internalId;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[kyte/payment] KV upsert failed', (err as Error).message);
    return undefined;
  }
}

function mapError(err: unknown): NextResponse {
  if (err instanceof KyteConfigError) {
    return NextResponse.json({ error: 'kyte not configured' }, { status: 503 });
  }
  if (err instanceof KyteProxyError) {
    return NextResponse.json({ error: 'kyte proxy error' }, { status: 502 });
  }
  if (err instanceof KyteAuthError) {
    return NextResponse.json({ error: 'kyte auth/IP rejected' }, { status: 502 });
  }
  if (err instanceof KyteValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof KyteServerError) {
    return NextResponse.json({ error: 'kyte upstream error' }, { status: 502 });
  }
  return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
}
