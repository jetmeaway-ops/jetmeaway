/**
 * Siri App Intents bridge — donates intents to iOS so they surface in
 * Spotlight + Shortcuts + Siri voice. Native module is a Swift App Intents
 * target (added in Phase 8 by the owner).
 *
 * Five intents:
 *   - "Show my trips"
 *   - "Find flights to <destination>"
 *   - "Find hotels in <city>"
 *   - "When is my next trip"
 *   - "Show price drops"
 *
 * Until the Swift target ships, donation calls are no-ops.
 */

import { NativeModules, Platform } from 'react-native';

type IntentDonation =
  | { kind: 'show-trips' }
  | { kind: 'find-flights'; destination: string }
  | { kind: 'find-hotels'; city: string }
  | { kind: 'next-trip' }
  | { kind: 'price-drops' };

type IntentsBridge = {
  donate(intent: IntentDonation): Promise<void>;
  clear(): Promise<void>;
};

const bridge: IntentsBridge | null =
  Platform.OS === 'ios' && (NativeModules as { IntentsBridge?: IntentsBridge }).IntentsBridge
    ? (NativeModules as { IntentsBridge: IntentsBridge }).IntentsBridge
    : null;

export async function donateIntent(intent: IntentDonation): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.donate(intent);
  } catch {
    /* non-fatal */
  }
}

export async function clearDonatedIntents(): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.clear();
  } catch {
    /* non-fatal */
  }
}
