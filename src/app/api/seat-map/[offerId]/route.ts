import { NextRequest, NextResponse } from 'next/server';
import { DUFFEL_VERSION } from '@/lib/duffel';

export const runtime = 'edge';

const DUFFEL_KEY =
  process.env.DUFFEL_TEST_TOKEN ||
  process.env.DUFFEL_ACCESS_TOKEN ||
  process.env.DUFFEL_API_KEY ||
  '';

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC SHAPE — what the client renders against
   ═══════════════════════════════════════════════════════════════════════════ */

export type SeatTier = 'standard' | 'extra_legroom' | 'preferred' | 'emergency_exit';
export type SeatCharacteristic = 'window' | 'aisle' | 'middle' | 'bulkhead';
export type SeatCabinClass = 'first' | 'business' | 'premium_economy' | 'economy';

export type PerPassengerSeat = {
  available: boolean;
  serviceId: string | null;
  priceAmount: number;
  priceDisplay: string | null;
};

export type SeatElement =
  | {
      kind: 'seat';
      designator: string;                  // "12A"
      tier: SeatTier;
      characteristics: SeatCharacteristic[];
      disclosures: string[];               // raw Duffel disclosures, for tooltip
      // Per-passenger: each pax may have a different serviceId/price for the
      // same seat. Keyed by Duffel passenger_id.
      perPassenger: Record<string, PerPassengerSeat>;
    }
  | { kind: 'aisle' }
  | { kind: 'missing' }      // bulkhead, galley, lavatory, etc — no seat here
  | { kind: 'exit_marker' }; // row-level exit indicator

export type SeatSection = { elements: SeatElement[] };

export type SeatRow = {
  rowNumber: number;
  isExitRow: boolean;
  sections: SeatSection[];
};

export type SeatCabin = {
  deck: 'main' | 'upper';
  cabinClass: SeatCabinClass;
  wings: { firstRow: number; lastRow: number } | null;
  rows: SeatRow[];
};

export type SeatMapResult = {
  segmentId: string;
  segmentLabel: string;        // pre-formatted for the segment tab strip
  aircraftCode: string | null; // "320", "77W" — for narrowbody vs widebody silhouette
  aircraftSilhouette: 'narrowbody' | 'widebody';
  cabins: SeatCabin[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   SPLIT CACHE — layout (24h) vs availability (60s)
   ───────────────────────────────────────────────────────────────────────────
   Edge runtime restarts drop the Map so this is best-effort per-instance.
   Production scale-up should move both layers to Vercel KV; interface stays
   identical. Key strategy:
     - layout:        (aircraft_code, cabin_class, airline_code) — position-only
     - availability:  offerId — per-passenger price + available flag
   Splitting means we can lazily rehydrate availability on every request while
   reusing the expensive position-parsing work across customers.
   ═══════════════════════════════════════════════════════════════════════════ */

type CacheEntry<T> = { value: T; expiresAt: number };
const layoutCache = new Map<string, CacheEntry<SeatCabin[]>>();
// Availability cache stores the full already-normalised seat map result per
// offer for 60s. Short-circuits Duffel calls on repeat hits (e.g. customer
// closes the modal and reopens it). Keyed by offerId.
const availabilityCache = new Map<string, CacheEntry<SeatMapResult[]>>();

const LAYOUT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const AVAILABILITY_TTL_MS = 60 * 1000;     // 60s

function cacheGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  // Evict ancient entries opportunistically — edge memory is tight.
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expiresAt < now) cache.delete(k);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   NORMALISERS
   ═══════════════════════════════════════════════════════════════════════════ */

const NARROWBODY_PREFIXES = ['31', '32', '73', '75', '19', 'E', 'CR', 'AT'];
function classifyAircraft(code: string | null): 'narrowbody' | 'widebody' {
  if (!code) return 'narrowbody';
  const upper = code.toUpperCase();
  if (NARROWBODY_PREFIXES.some((p) => upper.startsWith(p))) return 'narrowbody';
  return 'widebody';
}

function tierFromDisclosures(disclosures: string[]): SeatTier {
  const joined = disclosures.join(' ').toLowerCase();
  if (joined.includes('exit') || joined.includes('emergency')) return 'emergency_exit';
  if (joined.includes('legroom') || joined.includes('extra')) return 'extra_legroom';
  if (joined.includes('preferred') || joined.includes('premium')) return 'preferred';
  return 'standard';
}

function deriveCharacteristics(designator: string, positionInRow: number, rowWidth: number): SeatCharacteristic[] {
  const out: SeatCharacteristic[] = [];
  // Letter at end is the column; first/last in the row are windows.
  if (positionInRow === 0 || positionInRow === rowWidth - 1) out.push('window');
  else if (positionInRow === Math.floor(rowWidth / 2) - 1 || positionInRow === Math.floor(rowWidth / 2)) out.push('middle');
  else out.push('aisle');
  return out;
}

function formatPrice(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Free';
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${n.toFixed(2)}`;
}

function normaliseCabin(rawCabin: any): SeatCabin {
  const wings = rawCabin?.wings
    ? { firstRow: Number(rawCabin.wings.first_row_index ?? 0), lastRow: Number(rawCabin.wings.last_row_index ?? 0) }
    : null;

  const rows: SeatRow[] = (rawCabin?.rows || []).map((rawRow: any, rowIdx: number) => {
    const sections: SeatSection[] = (rawRow?.sections || []).map((rawSection: any) => {
      const rawElements: any[] = rawSection?.elements || [];
      const rowWidth = rawElements.filter((el) => el?.type === 'seat').length || rawElements.length;

      let seatPositionCounter = 0;
      const elements: SeatElement[] = rawElements.map((raw: any): SeatElement => {
        const t = raw?.type;
        if (t === 'seat') {
          const disclosures: string[] = Array.isArray(raw?.disclosures) ? raw.disclosures : [];
          const tier = tierFromDisclosures(disclosures);
          const characteristics = deriveCharacteristics(
            raw?.designator || '',
            seatPositionCounter++,
            rowWidth,
          );

          // Bulkhead / wheelchair / other Duffel "characteristics"
          if (typeof raw?.designator === 'string' && /bulkhead/i.test(disclosures.join(' '))) {
            characteristics.push('bulkhead');
          }

          const perPassenger: Record<string, PerPassengerSeat> = {};
          const services: any[] = Array.isArray(raw?.available_services) ? raw.available_services : [];
          for (const svc of services) {
            const pid = svc?.passenger_id;
            if (!pid) continue;
            const amt = parseFloat(svc?.total_amount || '0');
            const cur = svc?.total_currency || 'GBP';
            perPassenger[pid] = {
              available: true,
              serviceId: String(svc.id),
              priceAmount: amt,
              priceDisplay: formatPrice(amt, cur),
            };
          }

          return {
            kind: 'seat',
            designator: String(raw?.designator || ''),
            tier,
            characteristics,
            disclosures,
            perPassenger,
          };
        }
        if (t === 'empty') return { kind: 'aisle' };
        if (t === 'exit_row') return { kind: 'exit_marker' };
        // lavatory, galley, closet, bassinet → render as placeholder
        return { kind: 'missing' };
      });

      return { elements };
    });

    // Row is marked as exit if any element in it is an exit_marker OR any seat
    // disclosure mentions "exit" — Duffel is inconsistent across airlines.
    const isExitRow = sections.some((sec) =>
      sec.elements.some(
        (el) =>
          el.kind === 'exit_marker' ||
          (el.kind === 'seat' && el.tier === 'emergency_exit'),
      ),
    );

    return {
      rowNumber: Number(rawRow?.row_number ?? rowIdx + 1),
      isExitRow,
      sections,
    };
  });

  const cabinClassRaw = (rawCabin?.cabin_class || 'economy').toString().toLowerCase();
  const cabinClass: SeatCabinClass =
    cabinClassRaw === 'first' || cabinClassRaw === 'business' || cabinClassRaw === 'premium_economy'
      ? cabinClassRaw
      : 'economy';

  const deckRaw = rawCabin?.deck;
  const deck: 'main' | 'upper' = deckRaw === 1 || deckRaw === 'upper' ? 'upper' : 'main';

  return { deck, cabinClass, wings, rows };
}

function layoutKeyForSegment(seg: any, rawSeatMap: any): string {
  // Stable-ish key: aircraft_code + airline + cabin-class-list. Will cache hit
  // across different offers on the same aircraft/airline pairing.
  const aircraft = seg?.aircraft?.iata_code || rawSeatMap?.aircraft_code || 'unknown';
  const airline = seg?.marketing_carrier?.iata_code || 'XX';
  const cabins = (rawSeatMap?.cabins || [])
    .map((c: any) => c?.cabin_class || 'economy')
    .join(',');
  return `${airline}:${aircraft}:${cabins}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTE HANDLER
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;

  if (!offerId || !DUFFEL_KEY) {
    return NextResponse.json({ error: 'Invalid offer or missing API key' }, { status: 400 });
  }

  try {
    // ── 1. Pull the offer so we can stitch segment labels + aircraft info ──
    const offerRes = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
      headers: {
        Authorization: `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': DUFFEL_VERSION,
        Accept: 'application/json',
      },
    });
    if (!offerRes.ok) {
      if (offerRes.status === 404 || offerRes.status === 410) {
        return NextResponse.json({ error: 'Offer expired' }, { status: 410 });
      }
      return NextResponse.json({ error: 'Offer fetch failed' }, { status: offerRes.status });
    }
    const offerJson = await offerRes.json();
    const offer = offerJson.data;

    // Index segments for fast label + aircraft lookup
    const segmentsBySegId = new Map<string, any>();
    const sliceDirBySegId = new Map<string, 'outbound' | 'return'>();
    const slices = offer?.slices || [];
    slices.forEach((slice: any, sliceIdx: number) => {
      const dir = sliceIdx === 0 ? 'outbound' : 'return';
      for (const seg of slice?.segments || []) {
        if (seg?.id) {
          segmentsBySegId.set(seg.id, seg);
          sliceDirBySegId.set(seg.id, dir);
        }
      }
    });

    // ── 2. Availability cache short-circuit ──
    const cachedFull = cacheGet<SeatMapResult[]>(availabilityCache, offerId);
    if (cachedFull) {
      return NextResponse.json({ success: true, seatMaps: cachedFull, cache: 'hit' });
    }

    // ── 3. Fetch seat maps from Duffel ──
    const smRes = await fetch(`https://api.duffel.com/air/seat_maps?offer_id=${offerId}`, {
      headers: {
        Authorization: `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': DUFFEL_VERSION,
        Accept: 'application/json',
      },
    });

    if (!smRes.ok) {
      // Low-cost carriers sometimes return 404 / no-content. We fail soft —
      // the UI treats "no seat map" as "airline doesn't offer seat selection"
      // rather than a hard error.
      return NextResponse.json({ success: true, seatMaps: [], reason: 'no_seat_map' });
    }

    const smJson = await smRes.json();
    const rawSeatMaps: any[] = smJson.data || [];

    // ── 4. Normalise each seat map ──
    const seatMaps: SeatMapResult[] = rawSeatMaps.map((rawSm) => {
      const segId = rawSm?.segment_id;
      const seg = segId ? segmentsBySegId.get(segId) : null;
      const aircraftCode = seg?.aircraft?.iata_code || rawSm?.aircraft_code || null;

      // Layout cache: key by (airline, aircraft, cabin-class-list). Hit means
      // we reuse previously-normalised positions and just stitch in fresh prices.
      const layoutKey = layoutKeyForSegment(seg, rawSm);
      const cachedLayout = cacheGet<SeatCabin[]>(layoutCache, layoutKey);

      let cabins: SeatCabin[];
      if (cachedLayout) {
        // Layout hit: rehydrate perPassenger from fresh Duffel data.
        cabins = overlayAvailability(cachedLayout, rawSm);
      } else {
        cabins = (rawSm?.cabins || []).map(normaliseCabin);
        // Cache layout only (strip perPassenger to keep memory down). On next
        // hit we'll layer the live prices back on.
        const layoutOnly = stripAvailability(cabins);
        cacheSet(layoutCache, layoutKey, layoutOnly, LAYOUT_TTL_MS);
      }

      const dir = sliceDirBySegId.get(segId) || 'outbound';
      const originCode = seg?.origin?.iata_code || '';
      const destCode = seg?.destination?.iata_code || '';
      const depTimeIso = seg?.departing_at || null;
      const depTime = depTimeIso
        ? new Date(depTimeIso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '';
      const segmentLabel = [
        dir === 'outbound' ? 'Outbound' : 'Return',
        `${originCode} → ${destCode}`,
        depTime,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        segmentId: segId,
        segmentLabel,
        aircraftCode,
        aircraftSilhouette: classifyAircraft(aircraftCode),
        cabins,
      };
    });

    // ── 5. Cache the full availability result for 60s ──
    cacheSet(availabilityCache, offerId, seatMaps, AVAILABILITY_TTL_MS);

    return NextResponse.json({ success: true, seatMaps, cache: 'miss' });
  } catch (err: any) {
    console.error('Seat-map fetch error:', err);
    return NextResponse.json({ error: 'Failed to load seat map' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers for the split cache — strip availability for layout-only storage,
   and overlay fresh availability onto a cached layout.
   ═══════════════════════════════════════════════════════════════════════════ */

function stripAvailability(cabins: SeatCabin[]): SeatCabin[] {
  return cabins.map((cab) => ({
    ...cab,
    rows: cab.rows.map((row) => ({
      ...row,
      sections: row.sections.map((sec) => ({
        elements: sec.elements.map((el) => {
          if (el.kind !== 'seat') return el;
          return { ...el, perPassenger: {} };
        }),
      })),
    })),
  }));
}

function overlayAvailability(cachedLayout: SeatCabin[], rawSm: any): SeatCabin[] {
  // Build a map of designator -> per-passenger availability from the raw response.
  const priceByDesignator = new Map<string, Record<string, PerPassengerSeat>>();
  const rawCabins: any[] = rawSm?.cabins || [];
  for (const cab of rawCabins) {
    for (const row of cab?.rows || []) {
      for (const sec of row?.sections || []) {
        for (const el of sec?.elements || []) {
          if (el?.type !== 'seat') continue;
          const d = el?.designator;
          if (!d) continue;
          const perPax: Record<string, PerPassengerSeat> = {};
          for (const svc of el?.available_services || []) {
            const pid = svc?.passenger_id;
            if (!pid) continue;
            const amt = parseFloat(svc?.total_amount || '0');
            const cur = svc?.total_currency || 'GBP';
            perPax[pid] = {
              available: true,
              serviceId: String(svc.id),
              priceAmount: amt,
              priceDisplay: formatPrice(amt, cur),
            };
          }
          priceByDesignator.set(d, perPax);
        }
      }
    }
  }

  return cachedLayout.map((cab) => ({
    ...cab,
    rows: cab.rows.map((row) => ({
      ...row,
      sections: row.sections.map((sec) => ({
        elements: sec.elements.map((el) => {
          if (el.kind !== 'seat') return el;
          const fresh = priceByDesignator.get(el.designator) || {};
          return { ...el, perPassenger: fresh };
        }),
      })),
    })),
  }));
}
