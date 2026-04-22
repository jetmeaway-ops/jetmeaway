/* ═══════════════════════════════════════════════════════════════════════════
   Travelpayouts v1 flight_search helper
   ─────────────────────────────────────────────────────────────────────────
   The aviasales v3 prices_for_dates endpoint (used elsewhere in the app)
   returns cached fares only — no live GDS aggregation. For wider airline
   coverage (PIA, smaller national carriers, regional routes) we need the
   v1 async flow:

     1. POST  /v1/flight_search           → returns { search_id }
     2. GET   /v1/flight_search_results   → returns partial results per agent
        (poll repeatedly until `search_id_status: "finished"` or cap hit)

   Signature spec (per TP docs):
     - Take all leaf string values from the request body (incl. marker +
       user_ip), in the order dictated by ALPHABETICALLY SORTED keys of
       every object we encounter (depth-first).
     - Prefix with the API token.
     - Join everything with ":".
     - md5() the result → signature.

   Example for a one-way LON→DXB query:
       token:marker:host:ip:en:passengers.adults:0:1:...

   We keep this helper UI-agnostic: input shape matches what the user
   clicked in the flight form, output shape is normalised into the same
   row type the existing UI already renders. That keeps the UI rewire
   small — just swap the fetch target and add a poll loop.
   ═══════════════════════════════════════════════════════════════════════════ */

import { md5 } from './md5';

const TP_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN || 'cd373aa9b3cb3e9d84b7a45640adca15';
const TP_MARKER = process.env.TRAVELPAYOUTS_MARKER || '714449';
const TP_HOST = 'jetmeaway.co.uk';

export type Passengers = { adults: number; children: number; infants: number };

export type InitSearchInput = {
  origin: string;            // IATA — e.g. "LON"
  destination: string;        // IATA — e.g. "DXB"
  departureDate: string;      // YYYY-MM-DD
  returnDate?: string | null; // YYYY-MM-DD — omit/null for one-way
  passengers: Passengers;
  tripClass?: 'Y' | 'C' | 'F'; // economy / business / first
  userIp?: string;            // for auditing — fine to leave as our server IP
};

export type InitSearchResult = {
  searchId: string;
};

export type NormalisedFlight = {
  airline: string;
  airlineCode: string;
  price: number;
  currency: '£';
  stops: string;
  transfers: number;
  duration_to: number;
  duration_back: number;
  departure_at: string | null;
  return_at: string | null;
  flight_number: string | null;
  source: 'travelpayouts-v1';
  link: string | null;
};

export type PollResult = {
  complete: boolean;
  flights: NormalisedFlight[];
};

/* ─── Signature builder ─────────────────────────────────────────────────────

   Walks the signed payload object depth-first, with keys at every nesting
   level sorted A→Z. Primitive values are appended to a colon-joined
   string in the order encountered. Arrays of objects are flattened in
   index order (0, 1, 2…), with each object's keys sorted A→Z internally.
   This matches TP's reference behaviour.                                  */

function collectSignedValues(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) collectSignedValues(item, out);
    return;
  }
  if (typeof node === 'object') {
    const keys = Object.keys(node as Record<string, unknown>).sort();
    for (const k of keys) collectSignedValues((node as Record<string, unknown>)[k], out);
    return;
  }
  out.push(String(node));
}

function signPayload(payload: Record<string, unknown>): string {
  const values: string[] = [];
  collectSignedValues(payload, values);
  const signatureSource = [TP_TOKEN, ...values].join(':');
  return md5(signatureSource);
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

export async function initSearch(input: InitSearchInput): Promise<InitSearchResult> {
  const segments: Array<Record<string, string>> = [
    { origin: input.origin, destination: input.destination, date: input.departureDate },
  ];
  if (input.returnDate) {
    segments.push({ origin: input.destination, destination: input.origin, date: input.returnDate });
  }

  // Signed body shape — every field here contributes to the signature
  // source string (see collectSignedValues).
  const signedBody: Record<string, unknown> = {
    marker: TP_MARKER,
    host: TP_HOST,
    user_ip: input.userIp || '127.0.0.1',
    locale: 'en',
    // Force GBP so TP returns prices in pounds — default currency for
    // this marker is RUB, which leaks through as ~£64k "prices" on the UI.
    currency: 'gbp',
    trip_class: input.tripClass || 'Y',
    passengers: {
      adults: input.passengers.adults,
      children: input.passengers.children,
      infants: input.passengers.infants,
    },
    segments,
  };

  const signature = signPayload(signedBody);

  const res = await fetch('https://api.travelpayouts.com/v1/flight_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...signedBody, signature }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TP init ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { search_id?: string };
  if (!json.search_id) throw new Error('TP init response missing search_id');
  return { searchId: json.search_id };
}

/* ─── Result normalisation ──────────────────────────────────────────────────

   TP returns one result entry per GATE (agent) per PROPOSAL. A proposal
   is one priced itinerary; a gate is one agent selling it. We normalise
   by flattening (proposal × cheapest gate) and dedupe later in the
   polling route.                                                          */

type TPSegmentFlight = {
  operating_carrier?: string;
  marketing_carrier?: string;
  number?: string | number;
  departure?: string;          // IATA
  arrival?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_date?: string;
  arrival_time?: string;
  duration?: number;           // minutes
};
type TPProposal = {
  segment?: Array<{ flight?: TPSegmentFlight[] }>;
  terms?: Record<string, { unified_price?: number; price?: number; currency?: string; url?: number }>;
  validating_carrier?: string;
  total_duration?: number;
};
type TPResultsChunk = {
  search_id?: string;
  proposals?: TPProposal[];
  airports?: Record<string, { name?: string }>;
  airlines?: Record<string, { name?: string }>;
  gates_info?: Array<{ id: number; label: string }>;
  search_id_status?: string;
};

function isoFromSegment(flight: TPSegmentFlight | undefined): string | null {
  if (!flight || !flight.departure_date) return null;
  if (flight.departure_time) return `${flight.departure_date}T${flight.departure_time}`;
  return flight.departure_date;
}

function normaliseProposal(p: TPProposal): NormalisedFlight | null {
  const segs = p.segment || [];
  if (segs.length === 0) return null;
  const outFlights = segs[0]?.flight || [];
  const retFlights = segs[1]?.flight || [];
  if (outFlights.length === 0) return null;

  const firstOutLeg = outFlights[0];
  const lastOutLeg = outFlights[outFlights.length - 1];
  const firstRetLeg = retFlights[0];

  // Cheapest gate term for this proposal. Only trust a term when it
  // explicitly reports GBP — some agents ignore the signed currency
  // override and fall back to RUB, producing 5-figure "prices" that
  // would wreck the UI. Unified_price is in signed-currency so prefer
  // it; raw price is the native-currency fallback, accepted only when
  // the gate confirms currency === 'gbp'.
  //
  // CRITICAL unit conversion: TP v1 /flight_search_results returns
  // `unified_price` in MINOR currency units (pence for GBP), even
  // when currency: 'gbp' is explicitly signed in the init request.
  // v3 /prices_for_dates returns major units (pounds) — hence the
  // mismatch that produced £2,731 ghost-fares on LTN→MIL W4 in the
  // wild (real fare £27.31). We divide by 100 at the boundary so the
  // rest of the app keeps its "price = pounds" invariant.
  //
  // This is deliberately applied before the £10k sanity cap so that
  // cap still catches any RUB leak in the expected magnitude range.
  const terms = p.terms || {};
  let price = Infinity;
  for (const t of Object.values(terms)) {
    const cur = (t.currency || '').toLowerCase();
    // Strict: only accept when the gate confirms GBP. An empty/absent
    // currency is treated as untrusted — those are the gates leaking
    // RUB defaults (Etihad EY, Saudia SV, Pegasus PC on LON routes).
    if (cur !== 'gbp') continue;
    const rawCandidate = typeof t.unified_price === 'number' ? t.unified_price : t.price;
    if (typeof rawCandidate !== 'number') continue;
    const candidate = rawCandidate / 100;  // pence → pounds
    if (candidate < price) price = candidate;
  }
  if (!Number.isFinite(price)) return null;
  // Last-line sanity check — no LON→anywhere economy fare legitimately
  // tops £10k. If we still see one, the gate slipped an un-declared
  // RUB/other fare through; drop it rather than mislead the user.
  if (price > 10000) return null;

  const airline = p.validating_carrier || firstOutLeg.marketing_carrier || firstOutLeg.operating_carrier || '';
  const durationTo = outFlights.reduce((sum, f) => sum + (f.duration || 0), 0);
  const durationBack = retFlights.reduce((sum, f) => sum + (f.duration || 0), 0);
  const stopsOut = Math.max(0, outFlights.length - 1);

  return {
    airline,                    // code; the API route will humanise
    airlineCode: airline,
    price,
    currency: '£',
    stops: stopsOut === 0 ? 'Direct' : stopsOut === 1 ? '1 stop' : `${stopsOut} stops`,
    transfers: stopsOut,
    duration_to: durationTo,
    duration_back: durationBack,
    departure_at: isoFromSegment(firstOutLeg),
    return_at: isoFromSegment(firstRetLeg),
    flight_number: firstOutLeg.number ? `${airline}${firstOutLeg.number}` : null,
    source: 'travelpayouts-v1',
    link: null,                 // assembled on client click via /searches/{id}/clicks
  };
}

export async function fetchResults(searchId: string): Promise<PollResult> {
  const url = `https://api.travelpayouts.com/v1/flight_search_results?uuid=${encodeURIComponent(searchId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`TP results ${res.status}`);
  }
  // TP returns an array of chunks, one per agent batch. Each chunk may
  // contain proposals OR just a status flag. We walk them all.
  const chunks = (await res.json()) as TPResultsChunk[];
  const flights: NormalisedFlight[] = [];
  let complete = false;

  for (const chunk of chunks || []) {
    if (chunk.search_id_status && /finish|complete/i.test(chunk.search_id_status)) {
      complete = true;
    }
    for (const p of chunk.proposals || []) {
      const flight = normaliseProposal(p);
      if (flight) flights.push(flight);
    }
  }

  return { complete, flights };
}
