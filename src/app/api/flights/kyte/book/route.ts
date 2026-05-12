import { NextRequest, NextResponse } from 'next/server';
import {
  bookFlight,
  KyteAuthError,
  KyteConfigError,
  KyteProxyError,
  KyteServerError,
  KyteValidationError,
  type Gender,
  type KytePassenger,
  type Title,
} from '@/lib/kyte';

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/flights/kyte/book

   Step 2 of 3 in the Kyte sandbox booking flow:
     /search  →  this route  →  /payment  →  /retrieve

   ⚠ Node runtime (undici.ProxyAgent — Kyte requires the Fixie proxy).
   ⚠ PII in body — request body MUST NOT be logged. Logs are scrubbed to
     status + booking ID + currency + amount only.
   ⚠ TODO before production: gate this behind an authenticated session.
     Open sandbox-only for Phase 3.

   Body:
     {
       transactionId: string,    // returned by /search — threads the flow
       offerId: string,
       passengers: [
         { firstName, lastName, gender:'male'|'female', title, dateOfBirth,
           email, phone: { countryCode, number } }
       ],
       address?: { addressLines: string[], city, postalCode, countryCode },
       languageCode?: string,
     }

   Response (200):
     { bookingId, currentBalance, currency, ticketStatus }

   Response (4xx/5xx):
     { error: string }
   ═══════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs';
export const maxDuration = 30;

type InPassenger = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: Gender;
  title?: Title;
  dateOfBirth?: string;
  email?: string;
  phone?: { countryCode?: string; number?: string };
};

type Body = {
  transactionId?: string;
  offerId?: string;
  passengers?: InPassenger[];
  address?: {
    addressLines?: string[];
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
  languageCode?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const transactionId = (body.transactionId || '').trim();
  const offerId = (body.offerId || '').trim();
  const inPax = Array.isArray(body.passengers) ? body.passengers : [];

  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
  }
  if (!offerId) {
    return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
  }
  if (inPax.length === 0) {
    return NextResponse.json({ error: 'at least one passenger is required' }, { status: 400 });
  }

  // Map + validate every passenger. We intentionally fail the whole request
  // on any single missing field — partial bookings are worse than retry.
  const passengers: KytePassenger[] = [];
  for (let i = 0; i < inPax.length; i++) {
    const p = inPax[i] || {};
    const firstName = (p.firstName || '').trim();
    const lastName = (p.lastName || '').trim();
    const dateOfBirth = (p.dateOfBirth || '').trim();
    const email = (p.email || '').trim();
    const phoneCountry = (p.phone?.countryCode || '').trim();
    const phoneNumber = (p.phone?.number || '').trim();
    const gender = p.gender;
    const title = p.title;

    if (
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !email ||
      !phoneCountry ||
      !phoneNumber ||
      !gender ||
      !title
    ) {
      return NextResponse.json(
        { error: `passenger ${i + 1}: missing required field` },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return NextResponse.json(
        { error: `passenger ${i + 1}: dateOfBirth must be YYYY-MM-DD` },
        { status: 400 },
      );
    }

    passengers.push({
      id: String(i + 1),
      firstName,
      middleName: p.middleName?.trim() || undefined,
      lastName,
      gender,
      title,
      dateOfBirth,
      contactInformation: {
        email,
        phone: [{ countryCode: phoneCountry, number: phoneNumber, type: 'Mobile' }],
      },
    });
  }

  // Address optional. Only validate if present (Ryanair OTA needs it).
  let address: NonNullable<Body['address']> | undefined;
  if (body.address) {
    const a = body.address;
    if (
      !a.city ||
      !a.postalCode ||
      !a.countryCode ||
      !Array.isArray(a.addressLines) ||
      a.addressLines.length === 0
    ) {
      return NextResponse.json(
        { error: 'address requires addressLines, city, postalCode, countryCode' },
        { status: 400 },
      );
    }
    address = a;
  }

  try {
    const res = await bookFlight(
      offerId,
      {
        passengers,
        address: address
          ? {
              addressLines: address.addressLines!,
              city: address.city!,
              postalCode: address.postalCode!,
              countryCode: address.countryCode!,
            }
          : undefined,
        languageCode: body.languageCode,
      },
      { transactionId },
    );

    const bookingId = res.id ?? res.bookingId ?? res.booking?.id;
    const currentBalance = res.currentBalance ?? res.booking?.currentBalance;
    const ticketStatus = res.booking?.ticketStatus;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'kyte returned no booking id', raw: Object.keys(res || {}) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      bookingId,
      currentBalance,
      currency: res.currency || res.booking?.currency,
      ticketStatus,
    });
  } catch (e) {
    return mapError(e);
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
