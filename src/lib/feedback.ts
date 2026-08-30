/**
 * Post-stay feedback — the one contract shared by the email that asks and the
 * endpoint that registers.
 *
 * KV keys (NEW namespace, 2026-08-30 — nothing else reads or writes these):
 *   feedback:token:<ref>  — private per-booking token mailed out in the rating
 *                           links. 90-day TTL: after that the links go stale
 *                           and the endpoint answers with a polite "expired".
 *   feedback:entry:<ref>  — the registered feedback itself. NO TTL: a review
 *                           is an asset, not a cache.
 *   feedback:all          — array of refs with an entry, newest first, so the
 *                           admin can list reviews without scanning KV.
 */

export const FEEDBACK_SCORES = ['poor', 'fair', 'good', 'excellent'] as const;
export type FeedbackScore = (typeof FEEDBACK_SCORES)[number];

/** 1–4, so an average is computable later. */
export const FEEDBACK_SCORE_NUM: Record<FeedbackScore, number> = {
  poor: 1,
  fair: 2,
  good: 3,
  excellent: 4,
};

export const FEEDBACK_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

export const feedbackTokenKey = (ref: string) => `feedback:token:${ref}`;
export const feedbackEntryKey = (ref: string) => `feedback:entry:${ref}`;
export const FEEDBACK_INDEX_KEY = 'feedback:all';

export interface FeedbackEntry {
  ref: string;
  score: FeedbackScore;
  scoreNum: number;
  /** Free-text comment, optional, capped at 2000 chars at the endpoint. */
  comment?: string;
  /** Denormalised so the admin list renders without a booking lookup. */
  hotel?: string;
  city?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  /** First submission and last change, ISO. A guest may change their mind
   *  while the token lives; the entry keeps the latest score. */
  createdAt: string;
  updatedAt: string;
}

export function isFeedbackScore(s: unknown): s is FeedbackScore {
  return typeof s === 'string' && (FEEDBACK_SCORES as readonly string[]).includes(s);
}
