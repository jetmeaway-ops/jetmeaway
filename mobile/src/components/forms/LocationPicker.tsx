/**
 * LocationPicker — modal sheet listing popular UK origins (flights) or
 * top destinations (hotels / cars / packages), plus a "type your own"
 * free-text entry.
 *
 * Used as a stand-in for full Google-Places autocomplete in v1 — Phase 5/6
 * native results will mount the live debounced /api/flights/places +
 * /api/hotels/places autocomplete on top of this same UI.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../primitives';
import { haptics } from '../../hooks/useHaptics';

export type LocationOption = {
  /** What the search API expects (IATA, city name, etc.) */
  code: string;
  /** Human-readable label, e.g. "Barcelona" */
  label: string;
  /** Optional sub-label, e.g. "BCN · Spain" */
  sub?: string;
  /** Optional flag emoji */
  flag?: string;
};

type Props = {
  value: LocationOption | null;
  onChange: (next: LocationOption | null) => void;
  options: LocationOption[];
  /** Top label, e.g. "From" or "City" */
  placeholder: string;
  icon?: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap;
  /** Allow free-text entry. Returns { code: input.toUpperCase(), label: input } */
  allowCustom?: boolean;
  customHint?: string;
};

export default function LocationPicker({
  value,
  onChange,
  options,
  placeholder,
  icon = 'location-outline',
  allowCustom = true,
  customHint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const handleOpen = useCallback(() => {
    haptics.light();
    setFilter('');
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const handlePick = useCallback(
    (opt: LocationOption) => {
      haptics.light();
      onChange(opt);
      setOpen(false);
    },
    [onChange],
  );

  const handleCustom = useCallback(() => {
    const trimmed = filter.trim();
    if (!trimmed) return;
    handlePick({
      code: trimmed.toUpperCase(),
      label: trimmed,
      sub: 'Custom entry',
    });
  }, [filter, handlePick]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return options;
    const q = filter.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        (o.sub && o.sub.toLowerCase().includes(q)),
    );
  }, [filter, options]);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`${placeholder}: ${value?.label ?? 'Select'}`}
        style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      >
        <Ionicons name={icon} size={20} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{placeholder}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {value ? `${value.flag ? value.flag + ' ' : ''}${value.label}` : 'Select'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{placeholder}</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder={customHint ?? 'Type a city or airport'}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={allowCustom ? handleCustom : undefined}
            />
            {filter.length > 0 ? (
              <Pressable onPress={() => setFilter('')} hitSlop={12}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(o) => o.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              allowCustom && filter.trim() ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    Use “{filter.trim()}” as a custom entry
                  </Text>
                  <Button
                    title="Use this"
                    size="sm"
                    variant="secondary"
                    fullWidth
                    onPress={handleCustom}
                  />
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No matches.</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePick(item)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && styles.optionRowPressed,
                ]}
              >
                {item.flag ? <Text style={styles.optionFlag}>{item.flag}</Text> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  {item.sub ? <Text style={styles.optionSub}>{item.sub}</Text> : null}
                </View>
                <Text style={styles.optionCode}>{item.code}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.border }} />
            )}
          />
        </View>
      </Modal>
    </>
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
    flex: 0.85,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.h2, color: colors.textPrimary },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  optionRowPressed: { backgroundColor: colors.surfaceMuted },
  optionFlag: { fontSize: 24 },
  optionLabel: { ...typography.body, color: colors.textPrimary, fontFamily: 'Poppins_700Bold' },
  optionSub: { ...typography.caption, color: colors.textSecondary },
  optionCode: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'Poppins_700Bold',
  },

  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
