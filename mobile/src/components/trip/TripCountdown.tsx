/**
 * TripCountdown — live countdown widget for the Trip Detail hero. Re-renders
 * every minute so the displayed delta stays accurate without burning render
 * cycles. Once the trip start time has passed, switches to "On trip" / "Trip
 * complete" labels.
 *
 * Inputs are kept loose (`startDate`/`endDate` strings) because the ISO
 * dates we cache come from multiple suppliers in slightly different shapes.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  startDate?: string;
  endDate?: string;
};

type State =
  | { kind: 'future'; days: number; hours: number; minutes: number }
  | { kind: 'today' }
  | { kind: 'on-trip' }
  | { kind: 'past' }
  | { kind: 'unknown' };

function compute(startDate?: string, endDate?: string): State {
  if (!startDate) return { kind: 'unknown' };
  const start = new Date(startDate).getTime();
  if (!Number.isFinite(start)) return { kind: 'unknown' };

  const end = endDate ? new Date(endDate).getTime() : start;
  const now = Date.now();

  if (now >= start && now <= end) return { kind: 'on-trip' };
  if (now > end) return { kind: 'past' };

  const diffMs = start - now;
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;

  if (diffMs < day && new Date(start).toDateString() === new Date(now).toDateString()) {
    return { kind: 'today' };
  }

  return {
    kind: 'future',
    days: Math.floor(diffMs / day),
    hours: Math.floor((diffMs % day) / hour),
    minutes: Math.floor((diffMs % hour) / minute),
  };
}

export default function TripCountdown({ startDate, endDate }: Props) {
  const [state, setState] = useState<State>(() => compute(startDate, endDate));

  useEffect(() => {
    setState(compute(startDate, endDate));
    // Re-tick every 60 seconds — sufficient resolution for day/hour/minute
    // displays and avoids the cost of a per-second interval.
    const id = setInterval(() => setState(compute(startDate, endDate)), 60_000);
    return () => clearInterval(id);
  }, [startDate, endDate]);

  if (state.kind === 'unknown') return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{labelFor(state)}</Text>
      <Text style={styles.value}>{valueFor(state)}</Text>
    </View>
  );
}

function labelFor(s: State): string {
  switch (s.kind) {
    case 'future':   return 'DEPARTS IN';
    case 'today':    return 'TODAY';
    case 'on-trip':  return 'ON TRIP';
    case 'past':     return 'TRIP COMPLETE';
    case 'unknown':  return '';
  }
}

function valueFor(s: State): string {
  switch (s.kind) {
    case 'future':
      if (s.days >= 1) return `${s.days}d ${s.hours}h`;
      return `${s.hours}h ${s.minutes}m`;
    case 'today':    return 'Have a great trip';
    case 'on-trip':  return 'Enjoy';
    case 'past':     return 'Welcome home';
    case 'unknown':  return '';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brandSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.overline,
    color: colors.brand,
    marginBottom: 2,
  },
  value: {
    ...typography.h2,
    color: colors.brand,
  },
});
