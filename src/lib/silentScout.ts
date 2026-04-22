/**
 * Silent Scout — picks which of the four neighbourhood tabs
 * (Wellness / Family / Food / Daily Life) should be active by default
 * on the ScoutSidebar, inferred silently from the booking context.
 *
 * No age is collected. The signal is party composition × destination vibe.
 *
 * Tag shape is an ordered list — first tag wins for defaulting; remaining
 * tags are reserved for future ranking inside non-default tabs.
 */

export type VibeTag = 'foodie' | 'spa' | 'urban' | 'adventure';

/** Matches the tab keys used in ScoutSidebar. */
export type ScoutTab = 'wellness' | 'family' | 'food' | 'daily';

export interface ChooseTabInput {
  /** Number of adults in the booking. */
  adults: number;
  /** Number of children in the booking. */
  children: number;
  /** Ordered vibe tags for the destination. Empty = no signal. */
  vibeTags: VibeTag[];
}

/**
 * Rules matrix:
 *
 * | Party          | foodie | spa      | urban      | adventure  |
 * | -------------- | ------ | -------- | ---------- | ---------- |
 * | 1 adult        | food   | wellness | daily      | wellness   |
 * | 2+ adults      | food   | wellness | food       | daily      |
 * | With children  | family | family   | family     | family     |
 *
 * No vibe signal → 'food' (safe generic default, matches previous behaviour).
 */
export function chooseDefaultTab(input: ChooseTabInput): ScoutTab {
  const { adults, children, vibeTags } = input;

  // Children always win — family tab regardless of destination.
  if (children > 0) return 'family';

  const primary = vibeTags[0];

  // No vibe signal — fall back to 'food' (generic default).
  if (!primary) return 'food';

  const isSolo = adults <= 1;

  if (isSolo) {
    switch (primary) {
      case 'foodie':
        return 'food';
      case 'spa':
        return 'wellness';
      case 'urban':
        return 'daily';
      case 'adventure':
        return 'wellness';
    }
  } else {
    switch (primary) {
      case 'foodie':
        return 'food';
      case 'spa':
        return 'wellness';
      case 'urban':
        return 'food';
      case 'adventure':
        return 'daily';
    }
  }

  // Unreachable, but TS wants it.
  return 'food';
}
