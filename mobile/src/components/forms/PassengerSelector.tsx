/**
 * PassengerSelector — adults / children / infants stepper as a single row
 * with a sheet-style modal that opens on tap. Children and infant counts
 * cap at 6 and 2 respectively to match Duffel's offer-search constraints.
 */

import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../primitives';
import { haptics } from '../../hooks/useHaptics';

export type Passengers = {
  adults: number;
  children: number;
  infants: number;
};

const LIMITS = { adults: { min: 1, max: 9 }, children: { min: 0, max: 6 }, infants: { min: 0, max: 2 } } as const;

type Props = {
  value: Passengers;
  onChange: (next: Passengers) => void;
};

export default function PassengerSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Passengers>(value);

  const summary = (() => {
    const total = value.adults + value.children + value.infants;
    return `${total} passenger${total === 1 ? '' : 's'}`;
  })();

  const handleOpen = useCallback(() => {
    haptics.light();
    setDraft(value);
    setOpen(true);
  }, [value]);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleConfirm = useCallback(() => {
    onChange(draft);
    setOpen(false);
  }, [draft, onChange]);

  const adjust = useCallback(
    (key: keyof Passengers, delta: number) => {
      haptics.light();
      setDraft((prev) => {
        const next = Math.max(
          LIMITS[key].min,
          Math.min(LIMITS[key].max, prev[key] + delta),
        );
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  return (
    <>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`Passengers, ${summary}`}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      >
        <Ionicons name="people-outline" size={20} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Passengers</Text>
          <Text style={styles.value}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Passengers</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Stepper
            label="Adults"
            sub="12 years and over"
            value={draft.adults}
            onMinus={() => adjust('adults', -1)}
            onPlus={() => adjust('adults', +1)}
          />
          <Divider />
          <Stepper
            label="Children"
            sub="2 to 11 years"
            value={draft.children}
            onMinus={() => adjust('children', -1)}
            onPlus={() => adjust('children', +1)}
          />
          <Divider />
          <Stepper
            label="Infants"
            sub="Under 2, on lap"
            value={draft.infants}
            onMinus={() => adjust('infants', -1)}
            onPlus={() => adjust('infants', +1)}
          />

          <View style={styles.actions}>
            <Button title="Apply" size="md" fullWidth onPress={handleConfirm} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stepper({
  label,
  sub,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  sub: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperSub}>{sub}</Text>
      </View>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onMinus}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
        >
          <Ionicons name="remove" size={20} color={colors.brand} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={onPlus}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
        >
          <Ionicons name="add" size={20} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  fieldPressed: { backgroundColor: colors.surfaceMuted },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  value: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.h2, color: colors.textPrimary },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  stepperLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  stepperSub: { ...typography.caption, color: colors.textSecondary },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: { backgroundColor: colors.brandMuted },
  stepperValue: {
    ...typography.h3,
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  actions: { marginTop: spacing.lg },
});
