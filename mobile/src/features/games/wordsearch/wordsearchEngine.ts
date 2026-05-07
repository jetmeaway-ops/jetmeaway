/**
 * Word-search engine — pure logic, no React. Generates an N×N grid
 * filled with the requested words placed in legal directions plus
 * random A-Z filler. Also resolves a finger-drag (start cell + end
 * cell) to a candidate word from the grid.
 *
 * Difficulty mapping:
 *   0 Easy    6×6,   4 words, H + V
 *   1 Medium  9×9,   6 words, H + V + diagonals
 *   2 Hard   12×12,  8 words, H + V + diagonals + reversed H + reversed V
 *   3 Extra  15×15, 12 words, all 8 directions
 */

export type Cell = { row: number; col: number };

export type Direction = {
  dr: -1 | 0 | 1;
  dc: -1 | 0 | 1;
  /** Human label for analytics / debugging only. */
  name: string;
};

const DIR_E:  Direction = { dr:  0, dc:  1, name: 'E'  };
const DIR_S:  Direction = { dr:  1, dc:  0, name: 'S'  };
const DIR_W:  Direction = { dr:  0, dc: -1, name: 'W'  };
const DIR_N:  Direction = { dr: -1, dc:  0, name: 'N'  };
const DIR_SE: Direction = { dr:  1, dc:  1, name: 'SE' };
const DIR_SW: Direction = { dr:  1, dc: -1, name: 'SW' };
const DIR_NE: Direction = { dr: -1, dc:  1, name: 'NE' };
const DIR_NW: Direction = { dr: -1, dc: -1, name: 'NW' };

export const DIRECTION_SETS: Direction[][] = [
  // Easy: forward H + V only.
  [DIR_E, DIR_S],
  // Medium: + diagonals (forward only).
  [DIR_E, DIR_S, DIR_SE, DIR_SW],
  // Hard: + reversed H + V.
  [DIR_E, DIR_S, DIR_W, DIR_N, DIR_SE, DIR_SW],
  // Extra: all 8.
  [DIR_E, DIR_S, DIR_W, DIR_N, DIR_SE, DIR_SW, DIR_NE, DIR_NW],
];

export const WORDSEARCH_SPECS = [
  { size:  6, words: 4 },
  { size:  9, words: 6 },
  { size: 12, words: 8 },
  { size: 15, words: 12 },
] as const;

export type Placement = {
  word: string;
  start: Cell;
  end: Cell;
  direction: Direction;
  cells: Cell[];
};

export type GeneratedGrid = {
  size: number;
  grid: string[][];          // rows of single-character uppercase A-Z
  placements: Placement[];   // one per placed word, in order they were placed
};

/* ── Generation ────────────────────────────────────────────────────── */

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && c >= 0 && r < size && c < size;
}

function tryPlace(
  grid: string[][],
  word: string,
  start: Cell,
  dir: Direction,
): Cell[] | null {
  const cells: Cell[] = [];
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = start.row + dir.dr * i;
    const c = start.col + dir.dc * i;
    if (!inBounds(r, c, size)) return null;
    const existing = grid[r][c];
    if (existing && existing !== word[i]) return null;
    cells.push({ row: r, col: c });
  }
  return cells;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate an N×N grid containing the supplied words. Words that don't
 * fit after a bounded number of attempts are silently skipped — the
 * caller should pull replacements from the wordlist.
 */
export function generateGrid(
  size: number,
  words: string[],
  directions: Direction[],
): GeneratedGrid {
  const grid: string[][] = Array.from({ length: size }, () =>
    Array<string>(size).fill(''),
  );
  const placements: Placement[] = [];

  // Place longest first — better packing.
  const ordered = [...words].sort((a, b) => b.length - a.length);

  for (const word of ordered) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 80) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const start: Cell = {
        row: Math.floor(Math.random() * size),
        col: Math.floor(Math.random() * size),
      };
      const cells = tryPlace(grid, word, start, dir);
      if (!cells) continue;
      for (let i = 0; i < word.length; i++) {
        grid[cells[i].row][cells[i].col] = word[i];
      }
      placements.push({
        word,
        start: cells[0],
        end: cells[cells.length - 1],
        direction: dir,
        cells,
      });
      placed = true;
    }
  }

  // Fill blanks with random letters.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { size, grid, placements };
}

/**
 * Pick `count` words from a pool that fit within the board size. Always
 * returns shuffled order so successive games feel fresh.
 */
export function pickWords(pool: string[], count: number, maxLen: number): string[] {
  const candidates = pool
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ''))
    .filter((w) => w.length >= 3 && w.length <= maxLen);
  const unique = Array.from(new Set(candidates));
  shuffleInPlace(unique);
  return unique.slice(0, count);
}

/**
 * Build a fully-generated grid in one call given a difficulty level
 * (0..3) and a word pool drawn from a category. Encapsulates the
 * three-step pipeline (pickWords → generateGrid) so screen code stays
 * declarative.
 */
export function buildGameForCategory(
  difficulty: 0 | 1 | 2 | 3,
  categoryPool: string[],
): GeneratedGrid {
  const spec = WORDSEARCH_SPECS[difficulty];
  const directions = DIRECTION_SETS[difficulty];
  const words = pickWords(categoryPool, spec.words, spec.size);
  return generateGrid(spec.size, words, directions);
}

/* ── Drag resolution ───────────────────────────────────────────────── */

/**
 * Given a start + end cell, return the word formed along the straight
 * line between them, or null if the line isn't axis-aligned or
 * diagonal-aligned. The returned string reads start → end (so the
 * caller can match against forward AND reversed placements).
 */
export function readLine(grid: string[][], start: Cell, end: Cell): string | null {
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  const rowSpan = Math.abs(end.row - start.row);
  const colSpan = Math.abs(end.col - start.col);

  // Must be horizontal, vertical, or 45° diagonal.
  const isStraight =
    (dr === 0 && dc !== 0) ||
    (dc === 0 && dr !== 0) ||
    rowSpan === colSpan;
  if (!isStraight) return null;
  if (rowSpan === 0 && colSpan === 0) return null;

  const length = Math.max(rowSpan, colSpan) + 1;
  const size = grid.length;
  let out = '';
  for (let i = 0; i < length; i++) {
    const r = start.row + dr * i;
    const c = start.col + dc * i;
    if (!inBounds(r, c, size)) return null;
    out += grid[r][c];
  }
  return out;
}

/** All cells on the axis-aligned line between start and end (inclusive). */
export function lineCells(start: Cell, end: Cell): Cell[] {
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  const length = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col)) + 1;
  const out: Cell[] = [];
  for (let i = 0; i < length; i++) {
    out.push({ row: start.row + dr * i, col: start.col + dc * i });
  }
  return out;
}

/**
 * Given a drag (start → end) and the remaining word list, return the
 * matched word (forward or reversed) or null. Cells of the match are
 * returned so the UI can mark them as found.
 */
export function matchDrag(
  grid: string[][],
  start: Cell,
  end: Cell,
  remaining: string[],
): { word: string; cells: Cell[] } | null {
  const line = readLine(grid, start, end);
  if (!line) return null;
  const reversed = line.split('').reverse().join('');
  for (const w of remaining) {
    if (w === line || w === reversed) {
      return { word: w, cells: lineCells(start, end) };
    }
  }
  return null;
}
