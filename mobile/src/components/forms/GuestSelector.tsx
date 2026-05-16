/**
 * GuestSelector — adults + children + rooms picker. Returns a flat
 * occupancy shape `{ adults, children, rooms }` for /api/hotels.
 *
 * 2026-05-16 — added `rooms` stepper (1-5) after owner reported
 * "no room option, can't book for 5 adults across 2 rooms". The
 * comment that used to say "pick Add room on results" was wrong:
 * the website's room picker is buried inside the result-page
 * Guests modal and many users never find it. Fronting rooms here
 * lets the URL hand-off carry the choice straight to the website
 * search (the /hotels page already reads `?rooms=`).
 */

import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../primitives';
import { haptics } from '../../hooks/useHaptics';

export type Guests = {
  adults: number;
  children: number;
  rooms: number;
};

const LIMITS = {
  adults: { min: 1, max: 8 },
  children: { min: 0, max: 5 },
  rooms: { min: 1, max: 5 },
} as const;

type Props = {
  value: Guests;
  onChange: (next: Guests) => void;
};

export default function GuestSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Guests>(value);

  const summary = (() => {
    const parts = [`${value.adults} adult${value.adults === 1 ? '' : 's'}`];
    if (value.children > 0) {
      parts.push(`${value.children} child${value.children === 1 ? '' : 'ren'}`);
    }
    if (value.rooms > 1) {
      parts.push(`${value.rooms} rooms`);
    }
    return parts.join(' · ');
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
    (key: keyof Guests, delta: number) => {
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
        accessibilityLabel={`Guests, ${summary}`}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      >
        <Ionicons name="people-outline" size={20} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Guests</Text>
          <Text style={styles.value}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Guests</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Stepper
            label="Adults"
            sub="18 years and over"
            value={draft.adults}
            onMinus={() => adjust('adults', -1)}
            onPlus={() => adjust('adults', +1)}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stepper
            label="Children"
            sub="2 to 17 years"
            value={draft.children}
            onMinus={() => adjust('children', -1)}
            onPlus={() => adjust('children', +1)}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stepper
            label="Rooms"
            sub="Split a large group across multiple rooms"
            value={draft.rooms}
            onMinus={() => adjust('rooms', -1)}
            onPlus={() => adjust('rooms', +1)}
          />

          <Text style={styles.note}>
            Each room is priced separately. Most hotels accept up to 4 guests per room.
          </Text>

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
  note: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  actions: { marginTop: spacing.md },
});
