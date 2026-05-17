'use client';

import { useEffect, useRef, useState } from 'react';
import SeatMapModal, { type SeatSelectionsMap } from '@/components/SeatMapModal';

/* ─────────────────────────── Mock Duffel-shape data ─────────────────────
   Generates a 25-row A320-style narrowbody (3-3 layout) with:
     - rows 1-3 = extra_legroom (priced)
     - row 12 = emergency_exit
     - row 13 = emergency_exit
     - a handful of middle-seats marked unavailable for realism
   ───────────────────────────────────────────────────────────────────────── */

function makeMockSeatMap() {
  const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

  const rows = Array.from({ length: 25 }, (_, i) => {
    const rowNumber = i + 1;
    const isExit = rowNumber === 12 || rowNumber === 13;
    const isExtraLegroom = rowNumber <= 3;

    const seatFor = (letter: string, available: boolean, charKind: 'window' | 'middle' | 'aisle') => ({
      kind: 'seat' as const,
      designator: `${rowNumber}${letter}`,
      tier: (isExit ? 'emergency_exit' : isExtraLegroom ? 'extra_legroom' : 'standard') as
        'emergency_exit' | 'extra_legroom' | 'standard',
      characteristics: [charKind] as ('window' | 'middle' | 'aisle')[],
      disclosures: [],
      perPassenger: {
        pax_1: {
          available,
          serviceId: `svc_${rowNumber}${letter}`,
          priceAmount: isExtraLegroom ? 12 : isExit ? 8 : 0,
          priceDisplay: isExtraLegroom ? '£12.00' : isExit ? '£8.00' : 'Free',
        },
      },
    });

    const leftSection = {
      elements: [
        seatFor('A', true, 'window'),
        seatFor('B', rowNumber % 5 !== 0, 'middle'),
        seatFor('C', true, 'aisle'),
      ],
    };
    const rightSection = {
      elements: [
        seatFor('D', true, 'aisle'),
        seatFor('E', rowNumber % 7 !== 0, 'middle'),
        seatFor('F', true, 'window'),
      ],
    };

    return {
      rowNumber,
      isExitRow: isExit,
      sections: [leftSection, rightSection],
    };
  });

  return {
    success: true,
    seatMaps: [
      {
        segmentId: 'seg_mock_outbound',
        segmentLabel: 'Outbound · LHR → JFK · 10:30',
        aircraftCode: '320',
        aircraftSilhouette: 'narrowbody' as const,
        cabins: [
          {
            deck: 'main' as const,
            cabinClass: 'economy' as const,
            wings: { firstRow: 11, lastRow: 14 },
            rows,
          },
        ],
      },
    ],
    cache: 'mock',
  };
}

export default function DevSeatMapClient() {
  const [open, setOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const origFetchRef = useRef<typeof window.fetch | null>(null);

  // Intercept fetch for /api/seat-map/* only, return mock payload.
  // CRITICAL: bind originals to window — browser fetch / GLTFLoader fail
  // with "Illegal invocation" if `this` isn't the Window.
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    origFetchRef.current = origFetch;
    window.fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      if (url.includes('/api/seat-map/')) {
        return new Response(JSON.stringify(makeMockSeatMap()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return origFetch(input, init);
    };
    setOpen(true);
    return () => {
      window.fetch = origFetch;
    };
  }, []);

  if (!open) return null;

  return (
    <>
      <SeatMapModal
        offerId="dev-mock-offer"
        passengers={[{ id: 'pax_1', name: 'Sarah Khan' }]}
        initialSelections={new Map()}
        onClose={() => {
          setOpen(false);
          setTimeout(() => setOpen(true), 100); // reopen so dev page stays usable
        }}
        onSave={(sel: SeatSelectionsMap) => {
          const summary = [...sel.entries()].map(
            ([k, v]) => `${k} → ${v.designator} (${v.priceDisplay})`,
          ).join(', ');
          setLastSaved(summary || '(no selections)');
        }}
      />
      {lastSaved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
          Saved: {lastSaved}
        </div>
      )}
    </>
  );
}
