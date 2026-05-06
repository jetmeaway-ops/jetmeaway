/**
 * useNetwork — connection-state hook backing the offline banner and the
 * fail-fast behaviour in `apiClient`.
 *
 * - `online`: true when NetInfo reports `isConnected === true`. Defaults to
 *   `true` until the first NetInfo event lands so the UI doesn't flash an
 *   offline banner during the initial fetch.
 * - `type`: NetInfo connection type — 'wifi' | 'cellular' | 'none' |
 *   'unknown' | 'ethernet' | 'wimax' | 'bluetooth' | 'vpn' | 'other'.
 * - `lastOnlineAt`: epoch ms of the most recent online tick. Persisted to
 *   MMKV (`network:lastOnline`) so it survives kill, which lets the offline
 *   banner say something useful like "Last connected 6 hours ago".
 *
 * Subscribe-only — no work happens unless a component reads the hook.
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { storage } from '../services/storage';

const LAST_ONLINE_KEY = 'network:lastOnline';

export type NetworkSnapshot = {
  online: boolean;
  type: string;
  lastOnlineAt: number;
};

function snapshotFromState(state: NetInfoState | null, prevLastOnline: number): NetworkSnapshot {
  const online = state?.isConnected === true;
  return {
    online,
    type: state?.type ?? 'unknown',
    lastOnlineAt: online ? Date.now() : prevLastOnline,
  };
}

export function useNetwork(): NetworkSnapshot {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(() => ({
    online: true,
    type: 'unknown',
    lastOnlineAt: storage.getNumber(LAST_ONLINE_KEY) ?? Date.now(),
  }));

  useEffect(() => {
    let cancelled = false;

    NetInfo.fetch().then((initial) => {
      if (cancelled) return;
      const next = snapshotFromState(initial, snapshot.lastOnlineAt);
      if (next.online) storage.set(LAST_ONLINE_KEY, next.lastOnlineAt);
      setSnapshot(next);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setSnapshot((prev) => {
        const next = snapshotFromState(state, prev.lastOnlineAt);
        if (next.online) storage.set(LAST_ONLINE_KEY, next.lastOnlineAt);
        return next;
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // We intentionally only subscribe once on mount; downstream re-reads
    // come from the listener so depending on `snapshot.lastOnlineAt` would
    // re-subscribe on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return snapshot;
}
