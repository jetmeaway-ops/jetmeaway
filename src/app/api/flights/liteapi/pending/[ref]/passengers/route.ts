import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { FlightContact, FlightPassenger } from '@/lib/liteapi-flights';

export const runtime = 'edge';

// Parking gate (Kyte pattern) — flag unset in prod ⇒ every flight write route 404s
// ⇒ checkout is unreachable ⇒ nothing changes for live users. Preview sets it true.
const LITEAPI_FLIGHTS_ENABLED = process.env.LITEAPI_FLIGHTS_ENABLED === 'true';

/**
 * Pending flight record shape (KV key `pending-flight:{ref}`).
 *
 * Canonical owner is the start-booking route (spec §4.2), which mints the
 * record. We declare the fields this route reads/writes locally rather than
 * importing an import path that may not resolve during a concurrent build —
 * TypeScript structural typing keeps the two in sync. See scratch/flights-build-spec.md §14.
 */
interface PendingFlight {
  ref: string;
  type: 'flight';
  supplier: 'liteapi';
  state: 'pending' | 'prebooked' | 'confirmed' | 'failed';
  offerId: string;
  trip: {
    origin: string;
    destination: string;
    depDate: string;
    retDate?: string;
    adults: number;
    children: number;
    infants: number;
    cabin?: string;
    currency?: string;
    totalPrice?: number;
    airline?: string;
    airlineName?: string;
    segments?: unknown;
  };
  passengers?: FlightPassenger[];
  contact?: FlightContact;
  createdAt: number;
  updatedAt: number;
  [k: string]: unknown;
}

/**
 * POST /api/flights/liteapi/pending/[ref]/passengers
 *
 * Body: { passengers: FlightPassenger[], contact: FlightContact }
 *
 * Collected on the checkout page BEFORE prebook (flights collect passenger +
 * passport at prebook time, unlike hotels). Validates the passenger counts
 * against the trip's pax breakdown, then merges { passengers, contact } onto the
 * pending-flight record so the prebook route can read them straight from KV.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  // Gate first — before any work.
  if (!LITEAPI_FLIGHTS_ENABLED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { ref } = await params;
  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const passengersIn = Array.isArray(body?.passengers) ? body.passengers : null;
    const contactIn = body?.contact && typeof body.contact === 'object' ? body.contact : null;

    if (!passengersIn || passengersIn.length === 0) {
      return NextResponse.json({ error: 'passengers array is required' }, { status: 400 });
    }
    if (!contactIn) {
      return NextResponse.json({ error: 'contact is required' }, { status: 400 });
    }

    const record = await kv.get<PendingFlight>(`pending-flight:${ref}`);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // ── Validate counts vs. the trip's pax breakdown ──────────────────────
    const adults = Math.max(0, Math.round(Number(record.trip?.adults) || 0));
    const children = Math.max(0, Math.round(Number(record.trip?.children) || 0));
    const infants = Math.max(0, Math.round(Number(record.trip?.infants) || 0));
    const expectedTotal = adults + children + infants;

    if (passengersIn.length !== expectedTotal) {
      return NextResponse.json(
        {
          error: 'passenger_count_mismatch',
          detail: `Expected ${expectedTotal} passenger(s) (${adults} adult, ${children} child, ${infants} infant), got ${passengersIn.length}.`,
        },
        { status: 400 },
      );
    }

    // ── Normalise + validate each passenger ───────────────────────────────
    const passengers: FlightPassenger[] = [];
    for (let i = 0; i < passengersIn.length; i++) {
      const p = passengersIn[i];
      if (!p || typeof p !== 'object') {
        return NextResponse.json({ error: `passenger ${i + 1} is invalid` }, { status: 400 });
      }

      const firstName = String(p.firstName || '').trim();
      const lastName = String(p.lastName || '').trim();
      const birthday = String(p.birthday || '').trim();
      const gender = String(p.gender || '').trim().toUpperCase();
      const type = String(p.type || '').trim().toUpperCase();
      const nationality = String(p.nationality || '').trim().toUpperCase();

      if (!firstName || !lastName) {
        return NextResponse.json({ error: `passenger ${i + 1}: firstName and lastName are required` }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        return NextResponse.json({ error: `passenger ${i + 1}: birthday must be YYYY-MM-DD` }, { status: 400 });
      }
      if (gender !== 'M' && gender !== 'F' && gender !== 'X') {
        return NextResponse.json({ error: `passenger ${i + 1}: gender must be M, F or X` }, { status: 400 });
      }
      if (type !== 'ADULT' && type !== 'CHILD' && type !== 'INFANT') {
        return NextResponse.json({ error: `passenger ${i + 1}: type must be ADULT, CHILD or INFANT` }, { status: 400 });
      }
      if (!/^[A-Z]{2}$/.test(nationality)) {
        return NextResponse.json({ error: `passenger ${i + 1}: nationality must be a 2-letter country code` }, { status: 400 });
      }

      const clean: FlightPassenger = {
        firstName,
        lastName,
        birthday,
        gender: gender as FlightPassenger['gender'],
        type: type as FlightPassenger['type'],
        nationality,
      };

      // Passport fields (collected at checkout). Required together — the
      // document* fields are only meaningful when a number is supplied.
      const documentNumber = String(p.documentNumber || '').trim();
      if (documentNumber) {
        const documentIssueCountry = String(p.documentIssueCountry || '').trim().toUpperCase();
        const documentExpiry = String(p.documentExpiry || '').trim();
        if (!/^[A-Z]{2}$/.test(documentIssueCountry)) {
          return NextResponse.json({ error: `passenger ${i + 1}: documentIssueCountry must be a 2-letter country code` }, { status: 400 });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(documentExpiry)) {
          return NextResponse.json({ error: `passenger ${i + 1}: documentExpiry must be YYYY-MM-DD` }, { status: 400 });
        }
        clean.documentType = (String(p.documentType || '').trim() || 'passport').toLowerCase();
        clean.documentIssueCountry = documentIssueCountry;
        clean.documentNumber = documentNumber;
        clean.documentExpiry = documentExpiry;
      }

      passengers.push(clean);
    }

    // ── Per-type count validation (each ADULT/CHILD/INFANT must match trip) ─
    const countByType = { ADULT: 0, CHILD: 0, INFANT: 0 };
    for (const p of passengers) countByType[p.type] += 1;
    if (countByType.ADULT !== adults || countByType.CHILD !== children || countByType.INFANT !== infants) {
      return NextResponse.json(
        {
          error: 'passenger_type_mismatch',
          detail: `Expected ${adults} adult / ${children} child / ${infants} infant, got ${countByType.ADULT} / ${countByType.CHILD} / ${countByType.INFANT}.`,
        },
        { status: 400 },
      );
    }

    // ── Normalise + validate lead contact ─────────────────────────────────
    const cFirst = String(contactIn.firstName || '').trim();
    const cLast = String(contactIn.lastName || '').trim();
    const cEmail = String(contactIn.email || '').trim();
    // phoneCountryCode numeric ('44' not '+44'); phoneNumber digits only.
    const phoneCountryCode = String(contactIn.phoneCountryCode || '').replace(/\D/g, '');
    const phoneNumber = String(contactIn.phoneNumber || '').replace(/\D/g, '');

    if (!cFirst || !cLast) {
      return NextResponse.json({ error: 'contact: firstName and lastName are required' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cEmail)) {
      return NextResponse.json({ error: 'contact: a valid email is required' }, { status: 400 });
    }
    if (!phoneCountryCode || !phoneNumber) {
      return NextResponse.json({ error: 'contact: phoneCountryCode and phoneNumber are required' }, { status: 400 });
    }

    const contact: FlightContact = {
      firstName: cFirst,
      lastName: cLast,
      email: cEmail,
      phoneCountryCode,
      phoneNumber,
    };

    // ── Merge onto the record, preserve the 4h checkout TTL ────────────────
    const updated: PendingFlight = {
      ...record,
      passengers,
      contact,
      updatedAt: Date.now(),
    };

    await kv.set(`pending-flight:${ref}`, updated, { ex: 4 * 60 * 60 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[flights/pending/passengers]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
