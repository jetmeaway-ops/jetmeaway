/**
 * PuzzleScreen — top-level sliding-puzzle game. Owns difficulty selection,
 * the current board, the chosen image, and the win overlay. Layout
 * adapts to the available screen width so it looks right on both compact
 * Android phones and bigger iOS devices.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/primitives';
import { colors, spacing, typography } from '../../../theme';
import DifficultyPicker from '../components/DifficultyPicker';
import GameCompleteOverlay from '../components/GameCompleteOverlay';
import { useSound } from '../hooks/useSound';
import {
  type Difficulty,
  DIFFICULTY_LABELS,
  useGamesStore,
} from '../state/gamesStore';

/**
 * Celebratory chime for the puzzle. Wire a real MP3 by changing the
 * argument to `require('../assets/audio/chime.mp3')` once the asset
 * lands. Until then `playChime()` is a safe no-op so the win flow
 * completes without sound.
 */
const CHIME_SOURCE: number | null = null; // require('../assets/audio/chime.mp3')
import { PUZZLE_IMAGES, pickRandomImage } from './images';
import PuzzleBoard from './PuzzleBoard';
import {
  type Board,
  PUZZLE_SPECS,
  SHUFFLE_MOVES,
  isWin,
  move,
  shuffle,
} from './puzzleEngine';

const SCREEN_PADDING = spacing.lg;

export default function PuzzleScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const lastDifficulty = useGamesStore((s) => s.lastDifficulty.puzzle);
  const setLastDifficulty = useGamesStore((s) => s.setLastDifficulty);
  const recordWin = useGamesStore((s) => s.recordWin);
  const bestLevel = useGamesStore((s) => s.bestLevel.puzzle);
  const bestMovesByDifficulty = useGamesStore((s) => s.bestMoves.puzzle);

  const playChime = useSound(CHIME_SOURCE);

  const [difficulty, setDifficulty] = useState<Difficulty>(lastDifficulty);
  const [imageIndex, setImageIndex] = useState(() =>
    PUZZLE_IMAGES.indexOf(pickRandomImage()),
  );
  const spec = PUZZLE_SPECS[difficulty];
  const image = PUZZLE_IMAGES[imageIndex];

  const [board, setBoard] = useState<Board>(() =>
    shuffle(spec, SHUFFLE_MOVES[difficulty]),
  );
  const [moves, setMoves] = useState(0);
  const [wonAt, setWonAt] = useState<number | null>(null);

  // Reshuffle whenever difficulty changes.
  useEffect(() => {
    setBoard(shuffle(spec, SHUFFLE_MOVES[difficulty]));
    setMoves(0);
    setWonAt(null);
    setLastDifficulty('puzzle', difficulty);
    // spec is a stable reference per difficulty — fine to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const boardSize = useMemo(() => {
    // Square board, cap at 360 so it doesn't dominate large tablets.
    return Math.min(width - SCREEN_PADDING * 2, 360);
  }, [width]);

  const handleTap = (index: number) => {
    if (wonAt !== null) return;
    const next = move(board, spec, index);
    if (next === board) return;
    setBoard(next);
    setMoves((m) => m + 1);
    if (isWin(next, spec)) {
      const finalMoves = moves + 1;
      setWonAt(Date.now());
      recordWin('puzzle', difficulty, finalMoves);
      // Placeholder hook for the celebratory chime — fires immediately
      // on solve. GameCompleteOverlay also plays it once the modal
      // mounts; calling here means we get the sound the instant the
      // last tile snaps into place, even before the overlay fades in.
      playChime();
    }
  };

  const handleNewGame = () => {
    setBoard(shuffle(spec, SHUFFLE_MOVES[difficulty]));
    setMoves(0);
    setWonAt(null);
    setImageIndex((i) => (i + 1) % PUZZLE_IMAGES.length);
  };

  // Two distinct best-records:
  //  - bestMovesAtThisDifficulty: lowest move count the user has ever
  //    achieved at the currently-selected difficulty (the "high score"
  //    that motivates replay)
  //  - bestLevelLabel: highest difficulty ever cleared (badge on the
  //    GameHub card)
  const bestMovesAtThisDifficulty = bestMovesByDifficulty[difficulty];
  const bestLabel =
    bestMovesAtThisDifficulty !== null
      ? `Best: ${bestMovesAtThisDifficulty} moves`
      : bestLevel >= 0
        ? `Best level: ${DIFFICULTY_LABELS[bestLevel]}`
        : 'No wins yet';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.movesBar}>
        <View style={styles.movesBadge}>
          <Text style={styles.movesLabel}>MOVES</Text>
          <Text style={styles.movesValue}>{moves}</Text>
        </View>
        <Text style={styles.bestText}>{bestLabel}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OFFLINE GAME</Text>
        <Text style={styles.heading}>Image puzzle</Text>
        <Text style={styles.subheading}>
          Slide tiles into the blank space until the photo is restored.
        </Text>

        <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
          <PuzzleBoard
            board={board}
            spec={spec}
            size={boardSize}
            image={image.source}
            onTapTile={handleTap}
          />
        </View>

        <Text style={styles.imageLabel}>Photo: {image.label}</Text>

        <View style={styles.controls}>
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            caption={`${spec.rows} × ${spec.cols} grid`}
          />
          <Button title="New game" variant="secondary" onPress={handleNewGame} fullWidth />
        </View>
      </ScrollView>

      <GameCompleteOverlay
        visible={wonAt !== null}
        sound="chime"
        title="Photo restored!"
        subtitle={
          bestMovesAtThisDifficulty !== null && moves <= bestMovesAtThisDifficulty
            ? `New record! Solved ${DIFFICULTY_LABELS[difficulty]} in ${moves} moves.`
            : `Solved ${DIFFICULTY_LABELS[difficulty]} in ${moves} moves.`
        }
        onPlayAgain={handleNewGame}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  scrollContent: {
    padding: SCREEN_PADDING,
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.brand,
    alignSelf: 'flex-start',
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
  },
  movesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  movesBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.brandSubtle,
  },
  movesLabel: {
    ...typography.overline,
    color: colors.brand,
  },
  movesValue: {
    ...typography.h2,
    color: colors.brand,
    minWidth: 32,
    textAlign: 'right',
  },
  bestText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  boardWrap: {
    alignSelf: 'center',
  },
  imageLabel: { ...typography.bodySm, color: colors.textMuted },
  controls: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
