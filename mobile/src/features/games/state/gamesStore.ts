/**
 * Games store — zustand singleton persisted to MMKV. Tracks the highest
 * difficulty level the user has cleared per game (so GameHub can show a
 * "Best: Hard" badge), the last difficulty pick (so reopening a game
 * preselects it), and a lifetime wins counter.
 *
 * Persistence key: `jma:games:v1`. Bump the suffix on incompatible shape
 * changes so old payloads are silently dropped instead of crashing.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { storage } from '../../../services/storage';

export type Difficulty = 0 | 1 | 2 | 3;
export const DIFFICULTY_LABELS: readonly string[] = ['Easy', 'Medium', 'Hard', 'Extra'];

export type GameKey = 'puzzle' | 'wordsearch' | 'trivia';

/**
 * Per-game high scores keyed by difficulty index (0..3). Each value is
 * the lowest score we've recorded — fewer moves is better for the
 * puzzle, fewer seconds for trivia (when added). `null` means "no
 * record yet". We use `null` instead of -1/Infinity so the JSON
 * round-trip through MMKV stays human-readable when debugging.
 */
export type BestMovesByDifficulty = [number | null, number | null, number | null, number | null];

type GamesState = {
  bestLevel: Record<GameKey, Difficulty | -1>;
  bestMoves: Record<GameKey, BestMovesByDifficulty>;
  lastDifficulty: Record<GameKey, Difficulty>;
  totalWins: number;

  /**
   * Record a win. `score` is the lower-is-better metric — moves for the
   * puzzle, seconds for trivia (when added). Pass 0 / omit for games
   * where this metric is meaningless (e.g. word search currently);
   * it'll be stored but not displayed.
   */
  recordWin: (game: GameKey, difficulty: Difficulty, score?: number) => void;
  setLastDifficulty: (game: GameKey, difficulty: Difficulty) => void;
};

const EMPTY_MOVES: BestMovesByDifficulty = [null, null, null, null];

const INITIAL: Pick<GamesState, 'bestLevel' | 'bestMoves' | 'lastDifficulty' | 'totalWins'> = {
  bestLevel: { puzzle: -1, wordsearch: -1, trivia: -1 },
  bestMoves: {
    puzzle: [...EMPTY_MOVES] as BestMovesByDifficulty,
    wordsearch: [...EMPTY_MOVES] as BestMovesByDifficulty,
    trivia: [...EMPTY_MOVES] as BestMovesByDifficulty,
  },
  lastDifficulty: { puzzle: 0, wordsearch: 0, trivia: 0 },
  totalWins: 0,
};

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.remove(name);
  },
};

export const useGamesStore = create<GamesState>()(
  persist(
    (set) => ({
      ...INITIAL,
      recordWin: (game, difficulty, score = 0) =>
        set((s) => {
          const prev = s.bestMoves[game][difficulty];
          // Only update bestMoves if a meaningful score was supplied.
          // Score=0 means the caller doesn't track this metric.
          const nextSlot =
            score > 0 && (prev === null || score < prev) ? score : prev;
          const nextMovesArr = [...s.bestMoves[game]] as BestMovesByDifficulty;
          nextMovesArr[difficulty] = nextSlot;
          return {
            totalWins: s.totalWins + 1,
            bestLevel: {
              ...s.bestLevel,
              [game]: Math.max(s.bestLevel[game], difficulty) as Difficulty,
            },
            bestMoves: { ...s.bestMoves, [game]: nextMovesArr },
          };
        }),
      setLastDifficulty: (game, difficulty) =>
        set((s) => ({
          lastDifficulty: { ...s.lastDifficulty, [game]: difficulty },
        })),
    }),
    {
      name: 'jma:games:v1',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({
        bestLevel: s.bestLevel,
        bestMoves: s.bestMoves,
        lastDifficulty: s.lastDifficulty,
        totalWins: s.totalWins,
      }),
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return INITIAL;
        return persisted as Partial<GamesState>;
      },
    },
  ),
);
