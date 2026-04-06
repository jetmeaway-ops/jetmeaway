import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const ITEMS = [
  { name: 'eSIM Data Plans', icon: 'sim-card', color: '#DC2626', desc: 'Stay connected anywhere — no roaming charges' },
  { name: 'Things To Do', icon: 'compass', color: '#0891B2', desc: 'Activities, tours & experiences' },
  { name: 'Travel Insurance', icon: 'shield-alt', color: '#7C3AED', desc: 'Compare 6 insurance providers' },
  { name: 'Deal Alerts', icon: 'bell', color: '#FF6B00', desc: 'Get notified of price drops' },
];

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More Services</Text>
      {ITEMS.map((item) => (
        <TouchableOpacity key={item.name} style={styles.row} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
            <FontAwesome5 name={item.icon} size={18} color={item.color} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowDesc}>{item.desc}</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={12} color={Colors.secondary} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.websiteBtn}
        activeOpacity={0.8}
        onPress={() => Linking.openURL('https://jetmeaway.co.uk')}
      >
        <FontAwesome5 name="globe" size={14} color={Colors.primary} />
        <Text style={styles.websiteBtnText}>Visit jetmeaway.co.uk</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  title: { fontFamily: 'Poppins_900Black', fontSize: 24, color: Colors.dark, marginBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.dark },
  rowDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.secondary, marginTop: 2 },
  websiteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 20,
  },
  websiteBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.primary },
});
