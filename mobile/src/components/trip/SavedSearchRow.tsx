/**
 * SavedSearchRow — one row in the Saved Searches segment of the Trips
 * tab. Shows origin → destination, dates, and a colour-coded delta vs
 * the price the user saved at. Tapping pushes the prefill into the
 * search-context store and routes to the Search tab.
 */

import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Pill } from '../primitives';
import { colors, spacing, typography } from '../../theme';
import type { SavedSearch } from '../../api/types';
import { useSearchContext } from '../../store/search-context';

type Props = { search: SavedSearch };

export default function SavedSearchRow({ search }: Props) {
  const router = useRouter();
  const setPrefill = useSearchContext((s) => s.setPrefill);

  const handlePress = useCallback(() => {
    setPrefill({
      type: search.type,
      criteria: search.criteria,
      sourceId: search.id,
    });
    router.push('/(tabs)/search');
  }, [router, search, setPrefill]);

  const delta = priceDelta(search);
  const dates = formatDates(search);
  const route = formatRoute(search);

  return (
    <Card variant="interactive" onPress={handlePress} accessibilityLabel={search.label}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={search.type === 'flight' ? 'airplane' : 'bed'}
            size={14}
            color={colors.brand}
          />
        </View>
        {search.notify ? (
          <Pill tone="brand">ALERT ON</Pill>
        ) : (
          <Pill tone="neutral">ALERT OFF</Pill>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {route}
      </Text>
      {dates ? (
        <Text style={styles.dates} numberOfLines={1}>
          {dates}
        </Text>
      ) : null}

      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>SAVED</Text>
          <Text style={styles.priceValue}>{formatMoney(search.savedPricePence, search.currency)}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>NOW</Text>
          <Text style={styles.priceValue}>
            {search.lastObservedPricePence != null
              ? formatMoney(search.lastObservedPricePence, search.currency)
              : '—'}
          </Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>DELTA</Text>
          <Text style={[styles.delta, deltaColor(delta)]}>{deltaLabel(delta)}</Text>
        </View>
      </View>
    </Card>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

type Delta = { kind: 'down' | 'up' | 'flat' | 'unknown'; pct: number };

function priceDelta(s: SavedSearch): Delta {
  if (s.lastObservedPricePence == null || s.savedPricePence === 0) {
    return { kind: 'unknown', pct: 0 };
  }
  const diff = s.lastObservedPricePence - s.savedPricePence;
  const pct = Math.round((diff / s.savedPricePence) * 100);
  if (Math.abs(pct) < 1) return { kind: 'flat', pct: 0 };
  return { kind: pct < 0 ? 'down' : 'up', pct: Math.abs(pct) };
}

function deltaLabel(d: Delta): string {
  switch (d.kind) {
    case 'down':    return `▼ ${d.pct}%`;
    case 'up':      return `▲ ${d.pct}%`;
    case 'flat':    return '— 0%';
    case 'unknown': return '—';
  }
}

function deltaColor(d: Delta) {
  switch (d.kind) {
    case 'down':    return { color: colors.success };
    case 'up':      return { color: colors.danger };
    case 'flat':    return { color: colors.textMuted };
    case 'unknown': return { color: colors.textMuted };
  }
}

function formatMoney(pence: number, currency: string): string {
  const value = pence / 100;
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  return `${symbol}${value.toFixed(0)}`;
}

function formatRoute(s: SavedSearch): string {
  const c = s.criteria;
  if (s.type === 'flight') {
    const from = c.originLabel || c.origin || '?';
    const to = c.destinationLabel || c.destination || '?';
    return `${from}  →  ${to}`;
  }
  return c.destinationLabel || c.destination || s.label || 'Hotel search';
}

function formatDates(s: SavedSearch): string | null {
  const c = s.criteria;
  if (s.type === 'flight') {
    if (c.departure && c.return) return `${c.departure} → ${c.return}`;
    if (c.departure) return `${c.departure} (one-way)`;
    return null;
  }
  if (c.checkIn && c.checkOut) return `${c.checkIn} → ${c.checkOut}`;
  return null;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  dates: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  priceCol: { flex: 1 },
  priceLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: 2,
  },
  priceValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  delta: {
    ...typography.h3,
  },
});
