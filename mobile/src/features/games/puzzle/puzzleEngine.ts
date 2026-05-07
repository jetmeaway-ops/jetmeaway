/**
 * Sliding-puzzle engine — pure logic, no React. Boards are flat arrays of
 * tile values (0..N-1) where 0 represents the blank cell. Position in the
 * array is the cell location (row-major). The solved state has tile `i`
 * at position `i`, with the blank (0) at the last position.
 *
 * Solvability: shuffles are produced by walking N legal moves from the
 * solved state — never by random permutation — which guarantees every
 * shuffled board is solvable.
 *
 * Difficulty mapping (rows × cols):
 *   0 Easy       2 × 2   (3 movable tiles)
 *   1 Medium     3 × 2   (5 movable tiles)
 *   2 Hard       4 × 3   (11 movable tiles)
 *   3 Extra      4 × 4   (15 movable tiles — classic 15-puzzle)
 */

export type BoardSpec = { rows: number; cols: number };

export const PUZZLE_SPECS: BoardSpec[] = [
  { rows: 2, cols: 2 },
  { rows: 3, cols: 2 },
  { rows: 4, cols: 3 },
  { rows: 4, cols: 4 },
];

export const SHUFFLE_MOVES = [40, 80, 160, 240];

export type Board = readonly number[];

/** Solved board: [1, 2, ..., N-1, 0]. Blank lives in the last cell. */
export function createSolved({ rows, cols }: BoardSpec): Board {
  const total = rows * cols;
  const out: number[] = [];
  for (let i = 1; i < total; i++) out.push(i);
  out.push(0);
  return out;
}

export function blankIndex(board: Board): number {
  return board.indexOf(0);
}

function rowCol(idx: number, cols: number): [number, number] {
  return [Math.floor(idx / cols), idx % cols];
}

/** Indices adjacent to the blank (orthogonal neighbours only). */
export function legalMoveIndices(board: Board, spec: BoardSpec): number[] {
  const blank = blankIndex(board);
  const [br, bc] = rowCol(blank, spec.cols);
  const out: number[] = [];
  if (br > 0) out.push(blank - spec.cols);
  if (br < spec.rows - 1) out.push(blank + spec.cols);
  if (bc > 0) out.push(blank - 1);
  if (bc < spec.cols - 1) out.push(blank + 1);
  return out;
}

/**
 * Apply a tap on `tappedIdx`. Returns a new board if the tap is on a
 * tile orthogonally adjacent to the blank — otherwise returns the same
 * reference (useful for cheap re-render guards).
 */
export function move(board: Board, spec: BoardSpec, tappedIdx: number): Board {
  const moves = legalMoveIndices(board, spec);
  if (!moves.includes(tappedIdx)) return board;
  const blank = blankIndex(board);
  const next = board.slice();
  next[blank] = board[tappedIdx];
  next[tappedIdx] = 0;
  return next;
}

/**
 * Shuffle by walking N legal moves from a solved state. Guarantees the
 * result is reachable (and therefore solvable). Avoids immediately
 * undoing the previous move so we don't waste shuffle steps.
 */
export function shuffle(spec: BoardSpec, moves: number): Board {
  let board: Board = createSolved(spec);
  let lastBlank = blankIndex(board);
  for (let i = 0; i < moves; i++) {
    const candidates = legalMoveIndices(board, spec).filter(
      (idx) => idx !== lastBlank,
    );
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    lastBlank = blankIndex(board);
    board = move(board, spec, pick);
  }
  // Tiny sanity check — if shuffle produced the solved state (rare on
  // small boards), nudge by one extra move.
  if (isWin(board, spec)) {
    const candidates = legalMoveIndices(board, spec);
    board = move(board, spec, candidates[0]);
  }
  return board;
}

export function isWin(board: Board, spec: BoardSpec): boolean {
  const total = spec.rows * spec.cols;
  for (let i = 0; i < total - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[total - 1] === 0;
}

/**
 * For a given tile value, return its solved-state row/col. Used by the
 * board renderer to compute the negative offset for the image slice.
 */
export function tileSolvedPosition(value: number, spec: BoardSpec): [number, number] {
  // value 1 → (0,0), value 2 → (0,1), ..., last value at (rows-1, cols-2)
  const idx = value - 1;
  return [Math.floor(idx / spec.cols), idx % spec.cols];
}
