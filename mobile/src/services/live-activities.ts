/**
 * Live Activities bridge — starts / updates / ends an ActivityKit "Trip
 * Countdown" Live Activity from RN. Native module is a Swift target
 * (added in Phase 8 by the owner). All methods no-op until the bridge
 * ships.
 *
 * Lifecycle:
 *   - On trip save (Trips tab) and trip-detail open, if the trip start
 *     is within 24h, call `startTripActivity({ tripId, title, startsAt })`.
 *   - The widget refreshes every hour via APNS Live Activity push token
 *     until the trip starts; thereafter we call `updateTripActivity({
 *     tripId, status: 'on-trip' })` once.
 *   - On trip completion or cancellation, `endTripActivity({ tripId })`.
 *
 * Note: backend support (push token registration + cron-driven update
 * sender) ships alongside the Swift target.
 */

import { NativeModules, Platform } from 'react-native';

type StartArgs = {
  tripId: string;
  title: string;
  startsAt: string;
  destinationLabel?: string;
};

type UpdateArgs = {
  tripId: string;
  status: 'pending' | 'imminent' | 'on-trip';
};

type LiveActivitiesBridge = {
  start(args: StartArgs): Promise<{ token?: string }>;
  update(args: UpdateArgs): Promise<void>;
  end(tripId: string): Promise<void>;
};

const bridge: LiveActivitiesBridge | null =
  Platform.OS === 'ios' && (NativeModules as { LiveActivitiesBridge?: LiveActivitiesBridge }).LiveActivitiesBridge
    ? (NativeModules as { LiveActivitiesBridge: LiveActivitiesBridge }).LiveActivitiesBridge
    : null;

export async function startTripActivity(args: StartArgs): Promise<string | null> {
  if (!bridge) return null;
  try {
    const res = await bridge.start(args);
    return res.token ?? null;
  } catch {
    return null;
  }
}

export async function updateTripActivity(args: UpdateArgs): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.update(args);
  } catch {
    /* non-fatal */
  }
}

export async function endTripActivity(tripId: string): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.end(tripId);
  } catch {
    /* non-fatal */
  }
}
