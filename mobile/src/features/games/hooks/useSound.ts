/**
 * useSound — thin wrapper around expo-audio's `useAudioPlayer` that returns
 * a play() callback. Loads the asset lazily via require(), respects the
 * device silent switch (default expo-audio behaviour), and unloads on
 * unmount automatically.
 *
 * Pass `null` if the asset hasn't been bundled yet — the hook becomes a
 * no-op so games keep working without celebratory audio. This lets the
 * code ship before the final MP3s land.
 */

import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

type AudioSource = number | null;

export function useSound(source: AudioSource): () => void {
  // useAudioPlayer accepts null/undefined — safe when the bundled asset
  // is still a placeholder. The hook always runs (rules of hooks) but
  // .play() is a no-op against an empty player.
  const player = useAudioPlayer(source ?? undefined);

  return useCallback(() => {
    if (!source) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Swallow — never let a missing/corrupt sound asset crash a game.
    }
  }, [player, source]);
}
