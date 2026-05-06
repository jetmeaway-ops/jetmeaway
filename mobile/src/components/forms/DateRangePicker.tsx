/**
 * DateRangePicker — bottom-sheet calendar picker for outbound + return dates.
 *
 * Uses the JS-only `react-native-calendars` if installed; falls back to the
 * platform-native @react-native-community/datetimepicker via two sequential
 * dialogs (outbound, then return). For Phase 5 we use the platform picker
 * because it's already a transitive dep via expo and keeps the bundle lean.
 *
 * Public API:
 *   <DateRangePicker
 *     value={{ depart, return: null }}
 *     onChange={(next) => setRange(next)}
 *     mode="return"          // 'one-way' | 'return'
 *   />
 *
 * The component is fully controlled; consumers persist state.
 */

import { useCallback, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

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

export default function DateRangePicker({ value, onChange, mode = 'return' }: Props) {
  const [editing, setEditing] = useState<'depart' | 'return' | null>(null);
  const [draft, setDraft] = useState<Date | null>(null);

  const open = useCallback(
    (which: 'depart' | 'return') => {
      haptics.light();
      const seed = which === 'depart'
        ? value.depart ?? new Date()
        : value.return ?? value.depart ?? new Date();
      setDraft(seed);
      setEditing(which);
    },
    [value],
  );

  const close = useCallback(() => {
    setEditing(null);
    setDraft(null);
  }, []);

  const confirm = useCallback(() => {
    if (!draft || !editing) return close();
    if (editing === 'depart') {
      // If new depart > current return, clear return.
      const nextReturn = value.return && draft > value.return ? null : value.return;
      onChange({ depart: draft, return: nextReturn });
    } else {
      onChange({ depart: value.depart, return: draft });
    }
    close();
  }, [draft, editing, value, onChange, close]);

  const handleAndroidEvent = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === 'dismissed' || !date) {
        close();
        return;
      }
      // Android picker fires both `set` and dismiss in one cycle — apply
      // immediately rather than buffering through the iOS-style draft.
      if (editing === 'depart') {
        const nextReturn = value.return && date > value.return ? null : value.return;
        onChange({ depart: date, return: nextReturn });
      } else if (editing === 'return') {
        onChange({ depart: value.depart, return: date });
      }
      close();
    },
    [editing, value, onChange, close],
  );

  const minimumForReturn = value.depart ?? new Date();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => open('depart')}
        accessibilityRole="button"
        accessibilityLabel={`Depart ${fmt(value.depart)}`}
        style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
      >
        <Text style={styles.label}>Depart</Text>
        <Text style={styles.value}>{fmt(value.depart)}</Text>
      </Pressable>
      {mode === 'return' ? (
        <>
          <View style={styles.divider} />
          <Pressable
            onPress={() => open('return')}
            accessibilityRole="button"
            accessibilityLabel={`Return ${fmt(value.return)}`}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
          >
            <Text style={styles.label}>Return</Text>
            <Text style={styles.value}>{fmt(value.return)}</Text>
          </Pressable>
        </>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={!!editing}
          transparent
          animationType="slide"
          onRequestClose={close}
        >
          <Pressable style={styles.modalScrim} onPress={close} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing === 'depart' ? 'Depart' : 'Return'}
              </Text>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <DateTimePicker
              value={draft ?? new Date()}
              mode="date"
              display="inline"
              minimumDate={editing === 'return' ? minimumForReturn : new Date()}
              onChange={(_e, d) => d && setDraft(d)}
              themeVariant="light"
            />
            <View style={styles.modalActions}>
              <Button
                title="Confirm"
                size="md"
                fullWidth
                onPress={confirm}
              />
            </View>
          </View>
        </Modal>
      ) : editing ? (
        <DateTimePicker
          value={draft ?? new Date()}
          mode="date"
          minimumDate={editing === 'return' ? minimumForReturn : new Date()}
          onChange={handleAndroidEvent}
        />
      ) : null}
    </View>
  );
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

  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  modalActions: { marginTop: spacing.sm },
});
