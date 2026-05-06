/**
 * DateRangePicker — single unified calendar for picking depart + return on
 * one screen, just like Booking.com / Airbnb / Skyscanner.
 *
 *   Tap a day  →  that becomes the depart date.
 *   Tap a later day  →  that becomes the return date and the range fills
 *                       in between.
 *   Tap an earlier day after a range is set  →  that becomes the new
 *                       depart and clears the return.
 *
 * For one-way mode we collapse to a single-tap calendar — no return.
 *
 * Implementation uses `react-native-calendars` Calendar with
 * markingType="period" so the range visually fills with brand-blue.
 *
 * Public API unchanged from Phase 5:
 *   <DateRangePicker
 *     value={{ depart, return: null }}
 *     onChange={(next) => setRange(next)}
 *     mode="return"          // 'one-way' | 'return'
 *   />
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, type DateData } from 'react-native-calendars';

import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../primitives';
import { haptics } from '../../hooks/useHaptics';

export type DateRange = {
  depart: Date | null;
  return: Date | null;
};

type Props = {
  value: DateRange;
  onChange: (next: DateRange) => void;
  mode?: 'one-way' | 'return';
};

function fmt(d: Date | null): string {
  if (!d) return 'Select';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function toISO(d: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromISO(s: string): Date {
  // Construct as local midnight so the date string never shifts a day on
  // a non-UTC timezone.
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayISO(): string {
  return toISO(new Date()) ?? '';
}

export default function DateRangePicker({
  value,
  onChange,
  mode = 'return',
}: Props) {
  const [open, setOpen] = useState(false);
  // Local draft so taps inside the calendar don't fire the parent
  // onChange until the user hits Confirm.
  const [draft, setDraft] = useState<DateRange>(value);

  const openSheet = useCallback(() => {
    haptics.light();
    setDraft(value);
    setOpen(true);
  }, [value]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const confirm = useCallback(() => {
    onChange(draft);
    haptics.success();
    setOpen(false);
  }, [draft, onChange]);

  const onDayPress = useCallback(
    (day: DateData) => {
      const tapped = fromISO(day.dateString);
      haptics.light();

      if (mode === 'one-way') {
        setDraft({ depart: tapped, return: null });
        return;
      }

      // Return mode: range-pick logic.
      const { depart, return: ret } = draft;

      if (!depart || (depart && ret)) {
        // No depart yet, OR a complete range exists → reset to a new depart.
        setDraft({ depart: tapped, return: null });
        return;
      }

      // We have a depart but no return yet.
      if (tapped < depart) {
        // Tapped an earlier day → treat that as the new depart and drop
        // the existing one entirely.
        setDraft({ depart: tapped, return: null });
        return;
      }

      // Same-day tap or later tap → set return.
      setDraft({ depart, return: tapped });
    },
    [draft, mode],
  );

  const markedDates = useMemo(() => {
    return buildMarkedDates(draft, mode);
  }, [draft, mode]);

  const departText = fmt(value.depart);
  const returnText = fmt(value.return);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`Depart ${departText}`}
        style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
      >
        <Text style={styles.label}>Depart</Text>
        <Text style={styles.value}>{departText}</Text>
      </Pressable>
      {mode === 'return' ? (
        <>
          <View style={styles.divider} />
          <Pressable
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel={`Return ${returnText}`}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
          >
            <Text style={styles.label}>Return</Text>
            <Text style={styles.value}>{returnText}</Text>
          </Pressable>
        </>
      ) : null}

      <Modal
        visible={open}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <SafeAreaView style={styles.sheetRoot} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
              hitSlop={12}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.sheetTitle}>
              {mode === 'one-way' ? 'Pick a date' : 'Pick your dates'}
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Depart</Text>
              <Text style={[styles.summaryValue, !draft.depart && styles.summaryValueMuted]}>
                {fmt(draft.depart)}
              </Text>
            </View>
            {mode === 'return' ? (
              <>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.textMuted}
                  style={{ marginHorizontal: spacing.sm }}
                />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Return</Text>
                  <Text style={[styles.summaryValue, !draft.return && styles.summaryValueMuted]}>
                    {fmt(draft.return)}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <Calendar
            minDate={todayISO()}
            onDayPress={onDayPress}
            markingType="period"
            markedDates={markedDates}
            firstDay={1}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textMuted,
              selectedDayBackgroundColor: colors.brand,
              selectedDayTextColor: colors.textOnBrand,
              todayTextColor: colors.brand,
              dayTextColor: colors.textPrimary,
              textDisabledColor: colors.textMuted,
              monthTextColor: colors.textPrimary,
              indicatorColor: colors.brand,
              textDayFontFamily: 'Poppins_400Regular',
              textMonthFontFamily: 'Poppins_700Bold',
              textDayHeaderFontFamily: 'Poppins_600SemiBold',
              textDayFontSize: 15,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 12,
              arrowColor: colors.brand,
            }}
            style={styles.calendar}
          />

          <View style={styles.sheetActions}>
            <Button
              title={
                mode === 'one-way'
                  ? draft.depart
                    ? 'Confirm'
                    : 'Pick a date'
                  : draft.depart && draft.return
                    ? 'Confirm dates'
                    : draft.depart
                      ? 'Pick a return date'
                      : 'Pick a depart date'
              }
              size="lg"
              fullWidth
              onPress={confirm}
              disabled={!draft.depart || (mode === 'return' && !draft.return)}
              haptic={false}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/**
 * Build the markedDates map for react-native-calendars in "period" mode.
 *
 * Single-day:                       { '2026-05-10': { startingDay, endingDay, color } }
 * Range:                            { startISO: { startingDay, color },
 *                                     ...inBetween: { color },
 *                                     endISO: { endingDay, color } }
 */
function buildMarkedDates(
  range: DateRange,
  mode: 'one-way' | 'return',
): Record<string, { startingDay?: boolean; endingDay?: boolean; color: string; textColor?: string }> {
  const result: Record<
    string,
    { startingDay?: boolean; endingDay?: boolean; color: string; textColor?: string }
  > = {};

  const departISO = toISO(range.depart);
  const returnISO = toISO(range.return);

  if (!departISO) return result;

  if (mode === 'one-way' || !returnISO) {
    result[departISO] = {
      startingDay: true,
      endingDay: true,
      color: colors.brand,
      textColor: colors.textOnBrand,
    };
    return result;
  }

  // Walk every day from depart through return (inclusive).
  const start = fromISO(departISO);
  const end = fromISO(returnISO);
  const cursor = new Date(start);
  let isFirst = true;
  while (cursor <= end) {
    const iso = toISO(cursor);
    if (!iso) break;
    const isLast = iso === returnISO;
    result[iso] = {
      startingDay: isFirst || undefined,
      endingDay: isLast || undefined,
      color: colors.brand,
      textColor: colors.textOnBrand,
    };
    cursor.setDate(cursor.getDate() + 1);
    isFirst = false;
  }
  return result;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  cellPressed: { backgroundColor: colors.surfaceMuted },
  divider: { width: 1, backgroundColor: colors.border },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  value: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },

  sheetRoot: { flex: 1, backgroundColor: colors.surface },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetClose: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { ...typography.h2, color: colors.textPrimary },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  summaryCell: { alignItems: 'center', minWidth: 110, gap: 2 },
  summaryLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  summaryValue: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  summaryValueMuted: { color: colors.textMuted, fontFamily: 'Poppins_400Regular' },
  calendar: { paddingTop: spacing.sm },
  sheetActions: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
