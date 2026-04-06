import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export default function HotelsScreen() {
  const [city, setCity] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Find the <Text style={styles.accent}>Best</Text> Hotels</Text>
      <Text style={styles.subtitle}>Compare trusted hotel providers</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DESTINATION</Text>
        <TextInput
          style={styles.input}
          placeholder="City — e.g. Barcelona, Dubai"
          placeholderTextColor={Colors.secondary}
          value={city}
          onChangeText={setCity}
        />
      </View>

      {/* Star rating filter */}
      <Text style={styles.label}>HOTEL CLASS</Text>
      <View style={styles.starRow}>
        {['Any', '3★+', '4★+', '5★'].map((s) => (
          <TouchableOpacity key={s} style={styles.starBtn}>
            <Text style={styles.starText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Search Hotels</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Free comparison · Prices shown here · Click any hotel to book on the provider</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontFamily: 'Poppins_900Black', fontSize: 24, color: Colors.dark, textAlign: 'center' },
  accent: { color: '#FF6B00', fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
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
  starRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  starBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  starText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.body },
  searchBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B00',
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
