import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export default function PackagesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete <Text style={styles.accent}>Holiday</Text> Packages</Text>
      <Text style={styles.subtitle}>Flight + hotel bundles — compare prices</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>FROM</Text>
        <TextInput style={styles.input} placeholder="Departure airport" placeholderTextColor={Colors.secondary} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DESTINATION</Text>
        <TextInput style={styles.input} placeholder="Where do you want to go?" placeholderTextColor={Colors.secondary} />
      </View>

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Search Packages</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontFamily: 'Poppins_900Black', fontSize: 24, color: Colors.dark, textAlign: 'center' },
  accent: { color: '#7C3AED', fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  fieldGroup: { marginBottom: 16 },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: Colors.secondary, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.dark,
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  searchBtn: {
    flexDirection: 'row', backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  searchBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.white },
});
