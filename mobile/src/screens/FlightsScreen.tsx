import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export default function FlightsScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tripType, setTripType] = useState<'return' | 'oneway'>('return');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Find the <Text style={styles.accent}>Cheapest</Text> Flights</Text>
      <Text style={styles.subtitle}>Compare 5 providers in seconds</Text>

      {/* Trip type toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, tripType === 'return' && styles.toggleActive]}
          onPress={() => setTripType('return')}
        >
          <Text style={[styles.toggleText, tripType === 'return' && styles.toggleTextActive]}>↔ Return</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tripType === 'oneway' && styles.toggleActive]}
          onPress={() => setTripType('oneway')}
        >
          <Text style={[styles.toggleText, tripType === 'oneway' && styles.toggleTextActive]}>→ One-way</Text>
        </TouchableOpacity>
      </View>

      {/* Search fields */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>FROM</Text>
        <TextInput
          style={styles.input}
          placeholder="City or airport — e.g. Manchester"
          placeholderTextColor={Colors.secondary}
          value={from}
          onChangeText={setFrom}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>TO</Text>
        <TextInput
          style={styles.input}
          placeholder="City or airport — e.g. Barcelona"
          placeholderTextColor={Colors.secondary}
          value={to}
          onChangeText={setTo}
        />
      </View>

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Search Flights</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Free comparison · Click any deal to book on the provider site</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontFamily: 'Poppins_900Black', fontSize: 24, color: Colors.dark, textAlign: 'center' },
  accent: { color: Colors.primary, fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  toggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  toggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.secondary },
  toggleTextActive: { color: Colors.primary },
  fieldGroup: { marginBottom: 16 },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: Colors.secondary, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.white },
  disclaimer: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, textAlign: 'center', marginTop: 12 },
});
