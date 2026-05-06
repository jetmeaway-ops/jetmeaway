/**
 * Empty state for the Trips tab. Brand-tinted illustration block + clear
 * CTA back to Discover so first-launch users know what to do next.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../primitives';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  variant: 'upcoming' | 'past' | 'saved-searches';
};

const COPY: Record<Props['variant'], { title: string; body: string; cta: string; icon: keyof typeof Ionicons.glyphMap }> = {
  upcoming: {
    title: 'No upcoming trips yet',
    body: 'Once you book through JetMeAway, your trip lands here automatically — accessible offline at the airport too.',
    cta: 'Browse deals',
    icon: 'airplane-outline',
  },
  past: {
    title: 'Nothing in your travel history',
    body: 'Past trips will be archived here so you can rebook the favourites with one tap.',
    cta: 'Browse deals',
    icon: 'time-outline',
  },
  'saved-searches': {
    title: 'No saved searches',
    body: 'Save any search to track its price. We ping you the moment it drops 5% or more — no daily digest, no spam.',
    cta: 'Find your next trip',
    icon: 'bookmark-outline',
  },
};

export default function TripsEmptyState({ variant }: Props) {
  const router = useRouter();
  const c = COPY[variant];

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBubble}>
        <Ionicons name={c.icon} size={48} color={colors.brand} />
      </View>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.body}>{c.body}</Text>
      <Button
        title={c.cta}
        size="md"
        onPress={() => router.push('/(tabs)/discover')}
        haptic="light"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: radii.xxl,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    maxWidth: 360,
  },
});
