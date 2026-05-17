/**
 * cabin3d-mapping — flattens Duffel SeatCabin[] into 3D positions.
 *
 * The cabin-shell.glb is a fixed-size tube (22m long × 3.3m wide). To make
 * the 3D preview match real Duffel data, we compute X/Z positions for every
 * seat in the response based on its row/column index, then fit them inside
 * the shell. Row pitch is scaled so all rows fit within the shell length,
 * capped at MAX_ROW_PITCH so a small regional jet doesn't get absurdly
 * spaced seats.
 *
 * Output is consumed by Cabin3DProcedural which renders one clickable
 * primitive per position with materials tinted by state.
 */

import type {
  PerPassengerSeat,
  SeatCabin,
  SeatTier,
} from '@/components/SeatMapModal';

export type Seat3DPosition = {
  designator: string;          // "12A"
  x: number;                   // world X (lateral, across plane)
  z: number;                   // world Z (longitudinal, along plane)
  tier: SeatTier;
  available: boolean;
  price: PerPassengerSeat | null;
};

/* Probed from cabin-shell.glb on 2026-05-17. Re-probe if the asset changes. */
export const SHELL_METRICS = {
  length: 22.03,                 // Z extent
  width: 3.3,                    // X extent
  centerX: 0.25,
  centerZ: -3.23,
  floorY: 0.65,
} as const;

const MAX_ROW_PITCH = 1.0;       // metres — caps spacing for small cabins
const SEAT_WIDTH = 0.45;         // metres — visual seat slot
const AISLE_EXTRA = 0.3;         // extra metres for the aisle gap

/* ─────────────────────────── Public mapper ─────────────────────────── */

export function computeSeatPositions(
  cabins: SeatCabin[],
  passengerId: string,
): Seat3DPosition[] {
  // Flatten cabins → single ordered list of rows
  const allRows = cabins.flatMap((cab) => cab.rows);
  if (allRows.length === 0) return [];

  // Row pitch fits all rows in shell length, capped so few-row cabins
  // don't end up with metres of empty space between rows.
  const pitch = Math.min(SHELL_METRICS.length / allRows.length, MAX_ROW_PITCH);
  const startZ =
    SHELL_METRICS.centerZ - ((allRows.length - 1) * pitch) / 2;

  const out: Seat3DPosition[] = [];

  allRows.forEach((row, rowIdx) => {
    const z = startZ + rowIdx * pitch;

    // Build a lateral cell layout for this row. Cells = seats / placeholders /
    // section-break aisles. Total width is centred on SHELL_METRICS.centerX.
    type Cell = { kind: 'seat' | 'gap'; designator?: string; tier?: SeatTier; perPassenger?: Record<string, PerPassengerSeat> };
    const cells: Cell[] = [];

    row.sections.forEach((sec, secIdx) => {
      for (const el of sec.elements) {
        if (el.kind === 'seat') {
          cells.push({
            kind: 'seat',
            designator: el.designator,
            tier: el.tier,
            perPassenger: el.perPassenger,
          });
        } else if (el.kind === 'aisle' || el.kind === 'missing' || el.kind === 'exit_marker') {
          // All non-seat elements take a slot for layout purposes.
          cells.push({ kind: 'gap' });
        }
      }
      // Section boundary = aisle (extra gap between sections)
      if (secIdx < row.sections.length - 1) {
        cells.push({ kind: 'gap' });
      }
    });

    // Lay cells out left-to-right, centred on shell centre.
    const totalWidth = cells.length * SEAT_WIDTH +
      (row.sections.length - 1) * AISLE_EXTRA;
    let cursorX = SHELL_METRICS.centerX - totalWidth / 2;

    let cellIdx = 0;
    row.sections.forEach((sec, secIdx) => {
      sec.elements.forEach(() => {
        const cell = cells[cellIdx];
        const cellCenter = cursorX + SEAT_WIDTH / 2;
        if (cell.kind === 'seat' && cell.designator && cell.tier) {
          const paxPrice = cell.perPassenger?.[passengerId] ?? null;
          out.push({
            designator: cell.designator,
            x: cellCenter,
            z,
            tier: cell.tier,
            available: paxPrice?.available ?? false,
            price: paxPrice,
          });
        }
        cursorX += SEAT_WIDTH;
        cellIdx++;
      });
      if (secIdx < row.sections.length - 1) {
        cursorX += AISLE_EXTRA;
        cellIdx++;
      }
    });
  });

  return out;
}
