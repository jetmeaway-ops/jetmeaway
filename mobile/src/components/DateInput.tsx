import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function DateInput({ label, value, onChange, placeholder }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || 'YYYY-MM-DD'}
          placeholderTextColor={Colors.secondary}
        />
      </View>
    );
  }

  // Native: use DateTimePicker
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <Text style={[styles.inputText, !value && { color: Colors.secondary }]}>
          {value ? formatDisplay(value) : placeholder || 'Select date'}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(_: any, selectedDate?: Date) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(formatDate(selectedDate));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: Colors.secondary, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.dark },
});
