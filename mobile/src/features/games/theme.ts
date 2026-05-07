/**
 * Game-only design tokens. Reuses the app's primary theme but adds a
 * playful accent palette for win overlays and badges.
 */

import { colors as appColors } from '../../theme';

export const gameColors = {
  ...appColors,
  // Celebration accents — only used inside features/games.
  win: '#22C55E',
  winSoft: '#DCFCE7',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  // Highlight colour for word-search drag selection.
  highlight: '#0066FF',
  highlightSoft: '#BFD7FF',
  // Found-word strike-through colour.
  found: '#22C55E',
  foundSoft: '#86EFAC',
};
