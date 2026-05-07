/**
 * Bundled puzzle-image manifest. Each entry resolves at build time via
 * Metro's `require()` — no runtime fetch, no network, fully offline.
 *
 * Default set pulls from the brand assets that already ship with the
 * app (icon-canonical, splash, adaptive-preview) so we get visual
 * variety across the 4 puzzle slots without adding any new bytes to
 * the bundle. To swap in real travel photos later: drop JPGs into
 * `../assets/puzzle-images/` and replace the `source` value below.
 */

import type { ImageSourcePropType } from 'react-native';

const ICON_CANONICAL: ImageSourcePropType = require('../../../../assets/brand/icon-canonical.png');
const ADAPTIVE_PREVIEW: ImageSourcePropType = require('../../../../assets/brand/adaptive-preview.png');
const SPLASH: ImageSourcePropType = require('../../../../assets/images/splash.png');
const ADAPTIVE_ICON: ImageSourcePropType = require('../../../../assets/images/adaptive-icon.png');

export type PuzzleImage = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

export const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: 'jma-icon',     label: 'JetMeAway icon',    source: ICON_CANONICAL  },
  { id: 'jma-splash',   label: 'JetMeAway splash',  source: SPLASH          },
  { id: 'jma-adaptive', label: 'Adaptive preview',  source: ADAPTIVE_PREVIEW },
  { id: 'jma-mark',     label: 'Brand mark',        source: ADAPTIVE_ICON   },
];

export function pickRandomImage(): PuzzleImage {
  return PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
}
