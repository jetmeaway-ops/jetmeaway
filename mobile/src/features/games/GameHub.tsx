/**
 * GameHub — landing screen for offline games. Three cards in a single
 * column (works at any phone width on Android + iOS): Image Puzzle,
 * Word Search, and Trivia (locked, "coming soon"). Each card shows the
 * user's best-cleared difficulty if any.
 *
 * The "Offline-ready" pill is always shown — these games never call the
 * network, and that's a deliberate selling point for in-flight use.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

import { Card, Pill } from '../../components/primitives';
import { colors, radii, spacing, typography } from '../../theme';
import { gameColors } from './theme';
import {
  type GameKey,
  DIFFICULTY_LABELS,
  useGamesStore,
} from './state/gamesStore';

type GameCard = {
  key: GameKey;
  title: string;
  blurb: string;
  icon: string;
  href?: '/games/puzzle' | '/games/wordsearch' | '/games/trivia';
  available: boolean;
};

const CARDS: GameCard[] = [
  {
    key: 'puzzle',
    title: 'Image puzzle',
    blurb: 'Slide tiles to restore a travel photo. 4 to 16 pieces.',
    icon: 'th',
    href: '/games/puzzle',
    available: true,
  },
  {
    key: 'wordsearch',
    title: 'Word search',
    blurb: 'Find hidden travel words. From 6×6 up to 15×15.',
    icon: 'search',
    href: '/games/wordsearch',
    available: true,
  },
  {
    key: 'trivia',
    title: 'Travel trivia',
    blurb: 'Geography, landmarks & aviation. Beat the clock on Hard mode.',
    icon: 'question-circle',
    href: '/games/trivia',
    available: true,
  },
];

export default function GameHub() {
  const router = useRouter();
  const bestLevel = useGamesStore((s) => s.bestLevel);
  const totalWins = useGamesStore((s) => s.totalWins);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>OFFLINE GAMES</Text>
          <Text style={styles.heading}>Scout Lounge</Text>
          <Text style={styles.subheading}>
            Made for in-flight time. No signal needed.
          </Text>
          <View style={styles.pillRow}>
            <Pill tone="brand">
              <Text>Offline-ready</Text>
            </Pill>
            {totalWins > 0 ? (
              <Pill tone="success">
                <Text>{totalWins} wins</Text>
              </Pill>
            ) : null}
          </View>
        </View>

        <View style={styles.cardList}>
          {CARDS.map((card) => {
            const best = bestLevel[card.key];
            const bestLabel =
              best >= 0 ? `Best: ${DIFFICULTY_LABELS[best]}` : null;

            return (
              <Card
                key={card.key}
                variant={card.available ? 'interactive' : 'default'}
                onPress={
                  card.available && card.href
                    ? () => router.push(card.href as never)
                    : (() => {}) as never
                }
                style={!card.available ? styles.cardLocked : undefined}
              >
                <View style={styles.cardInner}>
                  <View
                    style={[
                      styles.iconBubble,
                      !card.available && styles.iconBubbleLocked,
                    ]}
                  >
                    <FontAwesome5
                      name={card.icon}
                      size={22}
                      color={card.available ? colors.brand : colors.textMuted}
                      solid
                    />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardBlurb}>{card.blurb}</Text>
                    <View style={styles.badgeRow}>
                      {bestLabel ? (
                        <Pill tone="success">
                          <Text>{bestLabel}</Text>
                        </Pill>
                      ) : null}
                      {!card.available ? (
                        <Pill tone="neutral">
                          <Text>Coming soon</Text>
                        </Pill>
                      ) : null}
                    </View>
                  </View>
                  {card.available ? (
                    <FontAwesome5
                      name="chevron-right"
                      size={14}
                      color={colors.textMuted}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>

        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            Your scores save on this device. Nothing is sent to JetMeAway.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs },
  eyebrow: { ...typography.overline, color: gameColors.brand },
  heading: { ...typography.display, color: colors.textPrimary },
  subheading: { ...typography.body, color: colors.textSecondary },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cardList: {
    gap: spacing.sm,
  },
  cardLocked: {
    opacity: 0.7,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  cardText: { flex: 1, gap: spacing.xxs },
  cardTitle: { ...typography.h3, color: colors.textPrimary },
  cardBlurb: { ...typography.bodySm, color: colors.textSecondary },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  footnote: { paddingTop: spacing.md },
  footnoteText: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
