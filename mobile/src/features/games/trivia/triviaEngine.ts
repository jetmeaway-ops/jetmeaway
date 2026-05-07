/**
 * Trivia engine — pure logic, no React. Owns the question shape, the
 * difficulty → timer/lives mapping, and the round-building helper.
 *
 * Difficulty matrix:
 *   0 Easy     no timer, full lives, score = correct count
 *   1 Medium   20s per question
 *   2 Hard     10s per question
 *   3 Extra    10s + Sudden Death (1 wrong = round over)
 */

export type Question = {
  id: string;
  q: string;
  choices: [string, string, string, string];
  /** 0..3 — index into `choices` */
  correct: 0 | 1 | 2 | 3;
};

/** Raw shape of `trivia.json` after JSON.parse. */
export type TriviaPayload = {
  categories: Record<string, Question[]>;
};

export type TriviaDifficulty = 0 | 1 | 2 | 3;

export type DifficultyConfig = {
  /** Seconds per question, or `null` for no timer (Easy). */
  timerSeconds: number | null;
  /** Number of wrong answers before the round ends. `Infinity` = play to end. */
  livesAllowed: number;
  /** Display label. */
  label: string;
};

export const DIFFICULTY_CONFIG: Record<TriviaDifficulty, DifficultyConfig> = {
  0: { timerSeconds: null, livesAllowed: Infinity, label: 'Easy' },
  1: { timerSeconds: 20,   livesAllowed: Infinity, label: 'Medium' },
  2: { timerSeconds: 10,   livesAllowed: Infinity, label: 'Hard' },
  3: { timerSeconds: 10,   livesAllowed: 1,        label: 'Extra (Sudden Death)' },
};

/** Number of questions per round, irrespective of difficulty. */
export const QUESTIONS_PER_ROUND = 8;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pull `count` random questions from a category pool. If the pool is
 * smaller than `count`, returns the whole pool shuffled.
 */
export function buildRound(pool: Question[], count = QUESTIONS_PER_ROUND): Question[] {
  const copy = [...pool];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(count, copy.length));
}

/**
 * Did the player win this round? Win = perfect score (no wrong
 * answers, no skipped/timed-out questions).
 */
export function isPerfectScore(correctCount: number, total: number): boolean {
  return correctCount === total;
}
