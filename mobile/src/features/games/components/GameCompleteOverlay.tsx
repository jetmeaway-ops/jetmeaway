/**
 * GameCompleteOverlay — full-screen celebration that appears when a game
 * is won. Plays a sound (when bundled), fires a success haptic, and shows
 * a "Play Again" / "Back" pair of CTAs.
 *
 * To enable sound: drop the MP3 into `../assets/audio/` and uncomment the
 * matching `require()` line below.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../../components/primitives';
import { colors, radii, shadows, spacing, typography } from '../../../theme';
import { gameColors } from '../theme';
import { useSound } from '../hooks/useSound';

// Audio sources. Swap each `null` for `require('../assets/audio/<file>.mp3')`
// once the MP3 is dropped in. Until then, `useSound(null)` is a safe no-op
// and the rest of the celebration still fires (haptic + overlay).
const SOUNDS = {
  chime: null as number | null,    // require('../assets/audio/chime.mp3')
  fanfare: null as number | null,  // require('../assets/audio/fanfare.mp3')
  victory: null as number | null,  // require('../assets/audio/victory.mp3')
};

export type SoundKey = keyof typeof SOUNDS;

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  sound?: SoundKey;
  onPlayAgain: () => void;
  onClose: () => void;
};

export default function GameCompleteOverlay({
  visible,
  title,
  subtitle,
  sound = 'chime',
  onPlayAgain,
  onClose,
}: Props) {
  const play = useSound(SOUNDS[sound]);

  useEffect(() => {
    if (!visible) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    play();
  }, [visible, play]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>LEVEL COMPLETE</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.actions}>
            <Button
              title="Play again"
              onPress={onPlayAgain}
              variant="primary"
              fullWidth
            />
            <Button
              title="Back to games"
              onPress={onClose}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 25, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.lg,
  },
  eyebrow: {
    ...typography.overline,
    color: gameColors.win,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
