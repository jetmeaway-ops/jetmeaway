/**
 * Spotlight indexing bridge — calls into the native SpotlightBridge module
 * (Swift, added in Phase 8 by the owner). Until the Swift bridge ships,
 * every method is a no-op so RN code can call into it without guards.
 *
 * On iOS 16+ Spotlight surfaces these as in-app search results so the
 * user can search "Paris" in iOS Spotlight and tap to land in the
 * relevant in-app view.
 */

import { NativeModules, Platform } from 'react-native';

type SpotlightItem = {
  /** Unique identifier — e.g. `trip:JMA-...` or `search:hash` */
  id: string;
  domain: 'trip' | 'saved-search';
  title: string;
  subtitle?: string;
  keywords?: string[];
  /** Deep link target — e.g. `/trip/JMA-...` */
  deepLink: string;
};

type SpotlightBridge = {
  index(items: SpotlightItem[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  removeAll(): Promise<void>;
};

const bridge: SpotlightBridge | null =
  Platform.OS === 'ios' && (NativeModules as { SpotlightBridge?: SpotlightBridge }).SpotlightBridge
    ? (NativeModules as { SpotlightBridge: SpotlightBridge }).SpotlightBridge
    : null;

export async function indexSpotlightItems(items: SpotlightItem[]): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.index(items);
  } catch {
    // Spotlight failures are non-fatal — they degrade discovery but don't
    // affect any in-app action.
  }
}

export async function removeSpotlightItems(ids: string[]): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.remove(ids);
  } catch {
    /* non-fatal */
  }
}

export async function clearSpotlightIndex(): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.removeAll();
  } catch {
    /* non-fatal */
  }
}
