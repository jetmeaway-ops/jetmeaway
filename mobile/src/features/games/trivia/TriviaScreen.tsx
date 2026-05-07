/**
 * TriviaScreen — multiple-choice trivia with category + difficulty
 * selection, optional per-question timer, and Sudden Death on Extra.
 *
 * Sound placeholders (drop MP3s into ../assets/audio/ and uncomment):
 *   CORRECT_SOURCE  — fires when the user picks the right answer
 *   WRONG_SOURCE    — fires on a wrong pick or a timeout
 *   VICTORY_SOURCE  — fires once on a perfect score, alongside recordWin
 *
 * Animation: each question slides in from the right via Reanimated
 * SlideInRight. Progress bar at the top reflects `idx / total`.
 *
 * Scoring rule: only a PERFECT score (every question correct) records a
 * win. Anything less plays through to the end with no win recorded.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '../../../components/primitives';
import { colors, radii, shadows, spacing, typography } from '../../../theme';
import DifficultyPicker from '../components/DifficultyPicker';
import GameCompleteOverlay from '../components/GameCompleteOverlay';
import { useSound } from '../hooks/useSound';
import { type Difficulty, useGamesStore } from '../state/gamesStore';
import triviaJson from '../assets/trivia.json';
import {
  type Question,
  type TriviaPayload,
  DIFFICULTY_CONFIG,
  buildRound,
  isPerfectScore,
} from './triviaEngine';

const SCREEN_PADDING = spacing.lg;

/* ── Sound placeholders ─────────────────────────────────────────────── */
const CORRECT_SOURCE: number | null = null; // require('../assets/audio/correct.mp3')
const WRONG_SOURCE: number | null = null;   // require('../assets/audio/wrong.mp3')
const VICTORY_SOURCE: number | null = null; // require('../assets/audio/victory.mp3')

/* ── Categories ─────────────────────────────────────────────────────── */
// JSON inference widens `choices` to `string[]`; cast through `unknown`
// to land on our 4-tuple Question shape. We trust the data file to
// always carry exactly 4 choices — the engine assumes it.
const CATEGORIES: Record<string, Question[]> =
  (triviaJson as unknown as TriviaPayload).categories;
const CATEGORY_NAMES = Object.keys(CATEGORIES);

type Phase = 'playing' | 'lost' | 'won';

export default function TriviaScreen() {
  const router = useRouter();

  const lastDifficulty = useGamesStore((s) => s.lastDifficulty.trivia);
  const setLastDifficulty = useGamesStore((s) => s.setLastDifficulty);
  const recordWin = useGamesStore((s) => s.recordWin);
  const bestLevel = useGamesStore((s) => s.bestLevel.trivia);

  const playCorrect = useSound(CORRECT_SOURCE);
  const playWrong = useSound(WRONG_SOURCE);
  const playVictory = useSound(VICTORY_SOURCE);

  const [difficulty, setDifficulty] = useState<Difficulty>(lastDifficulty);
  const [categoryName, setCategoryName] = useState<string>(CATEGORY_NAMES[0]);

  const config = DIFFICULTY_CONFIG[difficulty];
  const [round, setRound] = useState<Question[]>(() =>
    buildRound(CATEGORIES[CATEGORY_NAMES[0]]),
  );

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [livesLeft, setLivesLeft] = useState<number>(config.livesAllowed);
  const [phase, setPhase] = useState<Phase>('playing');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    config.timerSeconds,
  );

  const newGame = useCallback(
    (d: Difficulty, cat: string) => {
      const cfg = DIFFICULTY_CONFIG[d];
      setRound(buildRound(CATEGORIES[cat]));
      setIdx(0);
      setScore(0);
      setLivesLeft(cfg.livesAllowed);
      setPhase('playing');
      setPickedIndex(null);
      setSecondsLeft(cfg.timerSeconds);
    },
    [],
  );

  // Reshuffle when difficulty/category change.
  useEffect(() => {
    newGame(difficulty, categoryName);
    setLastDifficulty('trivia', difficulty);
  }, [difficulty, categoryName, newGame, setLastDifficulty]);

  /* ── Timer ──────────────────────────────────────────────────────── */
  // We keep the timer in a ref-driven setInterval so React re-renders
  // every second only update `secondsLeft`, not the timer itself.
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const advanceQuestion = useCallback(
    (correct: boolean) => {
      clearTimer();
      const isLastQuestion = idx + 1 >= round.length;

      if (correct) {
        setScore((s) => s + 1);
      } else {
        setLivesLeft((l) => l - 1);
      }

      // Sudden Death: any wrong answer ends the round immediately.
      if (!correct && config.livesAllowed === 1) {
        setPhase('lost');
        return;
      }

      if (isLastQuestion) {
        // Round complete — perfect score = win, anything else = end.
        const finalScore = score + (correct ? 1 : 0);
        if (isPerfectScore(finalScore, round.length)) {
          setPhase('won');
          recordWin('trivia', difficulty, finalScore);
          playVictory();
        } else {
          setPhase('lost');
        }
        return;
      }

      setIdx((i) => i + 1);
      setPickedIndex(null);
      setSecondsLeft(config.timerSeconds);
    },
    [
      clearTimer,
      idx,
      round.length,
      config.livesAllowed,
      config.timerSeconds,
      score,
      difficulty,
      recordWin,
      playVictory,
    ],
  );

  // (Re)start the timer whenever the question changes or the user has
  // not yet picked. Cleared on pick / unmount.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (config.timerSeconds === null) return;
    if (pickedIndex !== null) return;

    timeoutRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          // Out of time — count as wrong + advance.
          clearTimer();
          // Defer the state-driven advance to next tick to avoid
          // setState-during-update warnings inside the interval.
          setTimeout(() => {
            playWrong();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
              () => {},
            );
            advanceQuestion(false);
          }, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return clearTimer;
  }, [
    phase,
    config.timerSeconds,
    idx,
    pickedIndex,
    advanceQuestion,
    clearTimer,
    playWrong,
  ]);

  /* ── Pick handler ───────────────────────────────────────────────── */
  const onPick = useCallback(
    (choiceIndex: number) => {
      if (pickedIndex !== null || phase !== 'playing') return;
      setPickedIndex(choiceIndex);
      const correct = round[idx].correct === choiceIndex;
      if (correct) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        playCorrect();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => {},
        );
        playWrong();
      }
      // Brief pause so the user can see the colour feedback before the
      // next slide animates in.
      setTimeout(() => advanceQuestion(correct), 650);
    },
    [pickedIndex, phase, round, idx, advanceQuestion, playCorrect, playWrong],
  );

  /* ── Progress bar (animated width) ──────────────────────────────── */
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(
      (idx + (phase === 'playing' ? 0 : 1)) / round.length,
      { duration: 250, easing: Easing.out(Easing.cubic) },
    );
  }, [idx, phase, round.length, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  /* ── Render ─────────────────────────────────────────────────────── */
  const question = round[idx];
  const showCorrectness = pickedIndex !== null;
  const correctIndex = question?.correct;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.statusBar}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Question {Math.min(idx + 1, round.length)} of {round.length}
          </Text>
          <Text style={styles.statusText}>
            Score: {score}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>OFFLINE GAME</Text>
        <Text style={styles.heading}>Travel trivia</Text>
        <Text style={styles.subheading}>
          {config.timerSeconds === null
            ? 'No timer — take your time.'
            : `${config.timerSeconds}s per question${config.livesAllowed === 1 ? ' · Sudden death' : ''}.`}
        </Text>

        {/* Category chips */}
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

        {/* Question card — slides in from the right on every change. */}
        {question ? (
          <Animated.View
            // Re-keying on idx forces the entering animation to fire each
            // question. SlideInRight is the Reanimated layout animation.
            key={`q-${idx}`}
            entering={SlideInRight.duration(280).easing(Easing.out(Easing.cubic))}
            style={styles.card}
          >
            <View style={styles.timerRow}>
              {config.timerSeconds !== null ? (
                <View style={styles.timerPill}>
                  <Text style={styles.timerText}>
                    {Math.max(0, secondsLeft ?? 0)}s
                  </Text>
                </View>
              ) : (
                <View />
              )}
              {config.livesAllowed === 1 ? (
                <View style={styles.suddenDeathPill}>
                  <Text style={styles.suddenDeathText}>SUDDEN DEATH</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.questionText}>{question.q}</Text>

            <View style={styles.choices}>
              {question.choices.map((choice, choiceIndex) => {
                const isPicked = pickedIndex === choiceIndex;
                const isCorrect = correctIndex === choiceIndex;
                let stateStyle = styles.choiceIdle;
                let textStyle = styles.choiceTextIdle;
                if (showCorrectness) {
                  if (isCorrect) {
                    stateStyle = styles.choiceCorrect;
                    textStyle = styles.choiceTextCorrect;
                  } else if (isPicked) {
                    stateStyle = styles.choiceWrong;
                    textStyle = styles.choiceTextWrong;
                  }
                }
                return (
                  <Pressable
                    key={choiceIndex}
                    onPress={() => onPick(choiceIndex)}
                    disabled={pickedIndex !== null}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.choice,
                      stateStyle,
                      pressed && pickedIndex === null && styles.choicePressed,
                    ]}
                  >
                    <Text style={[styles.choiceText, textStyle]}>{choice}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.controls}>
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            caption={config.label}
          />
          <Button
            title="Restart round"
            variant="secondary"
            onPress={() => newGame(difficulty, categoryName)}
            fullWidth
          />
        </View>
      </ScrollView>

      <GameCompleteOverlay
        visible={phase === 'won'}
        sound="victory"
        title="Perfect score!"
        subtitle={`You aced ${categoryName} on ${config.label}.`}
        onPlayAgain={() => newGame(difficulty, categoryName)}
        onClose={() => router.back()}
      />

      <GameCompleteOverlay
        visible={phase === 'lost'}
        sound="chime"
        title="Round over"
        subtitle={`You scored ${score} of ${round.length}. ${
          bestLevel >= difficulty ? '' : 'Try again for a perfect score!'
        }`}
        onPlayAgain={() => newGame(difficulty, categoryName)}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },

  /* Status / progress bar */
  statusBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 999,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: { ...typography.caption, color: colors.textSecondary },

  scrollContent: {
    padding: SCREEN_PADDING,
    gap: spacing.md,
  },
  eyebrow: { ...typography.overline, color: colors.brand },
  heading: { ...typography.h1, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary },

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
  categoryChipText: { ...typography.caption, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.textOnBrand },

  /* Question card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.brandSubtle,
  },
  timerText: { ...typography.caption, color: colors.brand },
  suddenDeathPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.dangerSubtle,
  },
  suddenDeathText: { ...typography.overline, color: colors.danger },
  questionText: { ...typography.h2, color: colors.textPrimary },

  /* Choices — vertical stack */
  choices: { gap: spacing.xs },
  choice: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  choicePressed: { opacity: 0.85 },
  choiceIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  choiceCorrect: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.success,
  },
  choiceWrong: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.danger,
  },
  choiceText: {
    ...typography.body,
  },
  choiceTextIdle: { color: colors.textPrimary },
  choiceTextCorrect: { color: colors.successStrong, fontFamily: 'Poppins_700Bold' },
  choiceTextWrong: { color: colors.dangerStrong, fontFamily: 'Poppins_700Bold' },

  controls: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
