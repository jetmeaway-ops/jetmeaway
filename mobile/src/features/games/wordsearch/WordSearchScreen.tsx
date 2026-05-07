/**
 * WordSearchScreen — top-level word-search game. The user picks a
 * category (Destinations / Aviation / Travel / Adventure) and a
 * difficulty level; the engine generates an N×N grid populated from
 * that category's word pool.
 *
 * Sound placeholders:
 *   CHIME_SOURCE   — fires on every successful word find (per-word feedback)
 *   FANFARE_SOURCE — fires once when the entire grid is cleared
 *
 * Both default to `null` so `useSound` no-ops until real MP3s are
 * dropped into `../assets/audio/` and the require() lines below are
 * uncommented. The game is fully playable without audio.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button, Pill } from '../../../components/primitives';
import { colors, radii, spacing, typography } from '../../../theme';
import DifficultyPicker from '../components/DifficultyPicker';
import GameCompleteOverlay from '../components/GameCompleteOverlay';
import { useSound } from '../hooks/useSound';
import {
  type Difficulty,
  DIFFICULTY_LABELS,
  useGamesStore,
} from '../state/gamesStore';
import wordsJson from '../assets/words.json';
import WordSearchGrid from './Grid';
import {
  type Cell,
  type GeneratedGrid,
  WORDSEARCH_SPECS,
  buildGameForCategory,
  matchDrag,
} from './wordsearchEngine';

const SCREEN_PADDING = spacing.lg;

/* ── Sound placeholders ─────────────────────────────────────────────── */
// To wire real audio: drop `chime.mp3` / `fanfare.mp3` into
// `../assets/audio/` and replace the `null` with a `require(...)` call.
const CHIME_SOURCE: number | null = null;   // require('../assets/audio/chime.mp3')
const FANFARE_SOURCE: number | null = null; // require('../assets/audio/fanfare.mp3')

/* ── Categories ─────────────────────────────────────────────────────── */
type CategoriesShape = { categories: Record<string, string[]> };
const CATEGORIES: Record<string, string[]> =
  (wordsJson as CategoriesShape).categories;
const CATEGORY_NAMES = Object.keys(CATEGORIES);

export default function WordSearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const lastDifficulty = useGamesStore((s) => s.lastDifficulty.wordsearch);
  const setLastDifficulty = useGamesStore((s) => s.setLastDifficulty);
  const recordWin = useGamesStore((s) => s.recordWin);
  const bestLevel = useGamesStore((s) => s.bestLevel.wordsearch);

  const playChime = useSound(CHIME_SOURCE);
  const playFanfare = useSound(FANFARE_SOURCE);

  const [difficulty, setDifficulty] = useState<Difficulty>(lastDifficulty);
  const [categoryName, setCategoryName] = useState<string>(CATEGORY_NAMES[0]);
  const spec = WORDSEARCH_SPECS[difficulty];

  const [generated, setGenerated] = useState<GeneratedGrid>(() =>
    buildGameForCategory(difficulty, CATEGORIES[CATEGORY_NAMES[0]]),
  );
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [wonAt, setWonAt] = useState<number | null>(null);

  const newGame = useCallback(
    (d: Difficulty, cat: string) => {
      setGenerated(buildGameForCategory(d, CATEGORIES[cat]));
      setFoundWords(new Set());
      setFoundCells(new Set());
      setWonAt(null);
    },
    [],
  );

  // Reshuffle whenever difficulty OR category changes.
  useEffect(() => {
    newGame(difficulty, categoryName);
    setLastDifficulty('wordsearch', difficulty);
  }, [difficulty, categoryName, newGame, setLastDifficulty]);

  const remainingWords = useMemo(
    () => generated.placements.map((p) => p.word).filter((w) => !foundWords.has(w)),
    [generated.placements, foundWords],
  );

  const handleLineSubmit = useCallback(
    (start: Cell, end: Cell) => {
      const match = matchDrag(generated.grid, start, end, remainingWords);
      if (!match) return;

      // Per-word feedback: light haptic + chime placeholder.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      playChime();

      const nextWords = new Set(foundWords);
      nextWords.add(match.word);
      const nextCells = new Set(foundCells);
      for (const cell of match.cells) nextCells.add(`${cell.row},${cell.col}`);
      setFoundWords(nextWords);
      setFoundCells(nextCells);

      // Grid cleared: record the win + fanfare placeholder. Overlay's
      // own sound prop is set to `fanfare` too so wiring either path
      // (here or there) gives the user the same audio cue.
      if (nextWords.size === generated.placements.length) {
        setWonAt(Date.now());
        recordWin('wordsearch', difficulty);
        playFanfare();
      }
    },
    [
      generated,
      remainingWords,
      foundWords,
      foundCells,
      difficulty,
      recordWin,
      playChime,
      playFanfare,
    ],
  );

  const gridSize = useMemo(
    () => Math.min(width - SCREEN_PADDING * 2, 360),
    [width],
  );

  const bestLabel =
    bestLevel >= 0 ? `Best: ${DIFFICULTY_LABELS[bestLevel]}` : 'No wins yet';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.statusBar}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusLabel}>FOUND</Text>
          <Text style={styles.statusValue}>
            {foundWords.size}
            <Text style={styles.statusValueDim}>
              {' '}
              / {generated.placements.length}
            </Text>
          </Text>
        </View>
        <Text style={styles.bestText}>{bestLabel}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OFFLINE GAME</Text>
        <Text style={styles.heading}>Word search</Text>
        <Text style={styles.subheading}>
          Drag your finger across letters to find every word in the category.
        </Text>

        {/* Category chips — horizontal scroll keeps the row tidy on small
            Android screens even if we add more categories later. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORY_NAMES.map((name) => {
            const isActive = name === categoryName;
            return (
              <Pressable
                key={name}
                onPress={() => setCategoryName(name)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.gridWrap, { width: gridSize, height: gridSize }]}>
          <WordSearchGrid
            grid={generated.grid}
            size={gridSize}
            foundCells={foundCells}
            onLineSubmit={handleLineSubmit}
          />
        </View>

        <View style={styles.wordList}>
          {generated.placements.map((p) => {
            const isFound = foundWords.has(p.word);
            return (
              <Pill key={p.word} tone={isFound ? 'success' : 'neutral'}>
                {isFound ? `✓ ${p.word}` : p.word}
              </Pill>
            );
          })}
        </View>

        <View style={styles.controls}>
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            caption={`${spec.size} × ${spec.size}, ${spec.words} words`}
          />
          <Button
            title="New game"
            variant="secondary"
            onPress={() => newGame(difficulty, categoryName)}
            fullWidth
          />
        </View>
      </ScrollView>

      <GameCompleteOverlay
        visible={wonAt !== null}
        sound="fanfare"
        title="All words found!"
        subtitle={`Cleared ${categoryName} on ${DIFFICULTY_LABELS[difficulty]} (${spec.size}×${spec.size}).`}
        onPlayAgain={() => newGame(difficulty, categoryName)}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },

  /* Status bar (Found counter + Best) — sticky at top, mirrors PuzzleScreen. */
  statusBar: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.brandSubtle,
  },
  statusLabel: { ...typography.overline, color: colors.brand },
  statusValue: { ...typography.h2, color: colors.brand },
  statusValueDim: { ...typography.h3, color: colors.brandStrong, opacity: 0.5 },
  bestText: { ...typography.caption, color: colors.textSecondary },

  scrollContent: {
    padding: SCREEN_PADDING,
    alignItems: 'stretch',
    gap: spacing.md,
  },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.h1, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary },

  /* Category chips */
  categoryRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textOnBrand,
  },

  gridWrap: { alignSelf: 'center' },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  controls: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
