import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DateInput from '../components/DateInput';

const LOCATIONS = [
  'Barcelona Airport (BCN)', 'Malaga Airport (AGP)', 'Palma Airport (PMI)',
  'Tenerife South Airport (TFS)', 'Faro Airport (FAO)', 'Alicante Airport (ALC)',
  'Antalya Airport (AYT)', 'Dubai Airport (DXB)', 'Rome Fiumicino (FCO)',
  'Athens Airport (ATH)', 'Lisbon Airport (LIS)', 'Paris CDG (CDG)',
  'London Heathrow (LHR)', 'Manchester (MAN)', 'Edinburgh (EDI)',
  'Cancun Airport (CUN)', 'Miami Airport (MIA)', 'Lanzarote Airport (ACE)',
  'Gran Canaria Airport (LPA)', 'Istanbul Airport (IST)',
];

const PROVIDERS = [
  { name: 'Economy Bookings', color: '#FF6B00', desc: 'Compares 900+ companies, free cancellation' },
  { name: 'Localrent', color: '#059669', desc: 'Direct from local owners, full insurance' },
  { name: 'Qeeq', color: '#2563EB', desc: 'Compares 300+ suppliers, price match' },
  { name: 'GetRentaCar', color: '#7C3AED', desc: 'Budget-friendly, no hidden charges' },
  { name: 'Expedia', color: '#1A1A6C', desc: 'Earn rewards, flexible cancellation' },
];

export default function CarsScreen() {
  const [location, setLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('30');
  const [searched, setSearched] = useState(false);
  const [showLocationList, setShowLocationList] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!location) return LOCATIONS.slice(0, 6);
    const q = location.toLowerCase();
    return LOCATIONS.filter(l => l.toLowerCase().includes(q));
  }, [location]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Hire a Car <Text style={styles.accent}>Anywhere</Text></Text>
      <Text style={styles.subtitle}>Compare 5 trusted car rental providers</Text>

      <View style={[styles.fieldGroup, { zIndex: 10 }]}>
        <Text style={styles.label}>PICKUP LOCATION</Text>
        <TextInput style={styles.input} placeholder="Airport or city — e.g. Barcelona" placeholderTextColor={Colors.secondary}
          value={location} onChangeText={(t) => { setLocation(t); setShowLocationList(true); }} onFocus={() => setShowLocationList(true)} />
        {showLocationList && filteredLocations.length > 0 && (
          <View style={styles.dropdown}>
            {filteredLocations.slice(0, 5).map(l => (
              <TouchableOpacity key={l} style={styles.dropdownItem} onPress={() => { setLocation(l); setShowLocationList(false); }}>
                <Text style={styles.dropdownText}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <DateInput label="PICKUP DATE" value={pickupDate} onChange={setPickupDate} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>PICKUP TIME</Text>
          <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={Colors.secondary}
            value={pickupTime} onChangeText={setPickupTime} />
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <DateInput label="RETURN DATE" value={dropoffDate} onChange={setDropoffDate} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>RETURN TIME</Text>
          <TextInput style={styles.input} placeholder="10:00" placeholderTextColor={Colors.secondary}
            value={dropoffTime} onChangeText={setDropoffTime} />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DRIVER AGE</Text>
        <TextInput style={[styles.input, { width: 100 }]} placeholder="30" placeholderTextColor={Colors.secondary}
          value={driverAge} onChangeText={setDriverAge} keyboardType="number-pad" />
      </View>

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={() => setSearched(true)}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Search Car Rentals</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Free comparison · Click any provider to book on their site</Text>

      {searched && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Compare on 5 providers</Text>
          {PROVIDERS.map(p => (
            <TouchableOpacity key={p.name} style={styles.providerCard} activeOpacity={0.7}
              onPress={() => Linking.openURL('https://jetmeaway.co.uk/cars')}>
              <View style={[styles.providerDot, { backgroundColor: p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerDesc}>{p.desc}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#059669" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontFamily: 'Poppins_900Black', fontSize: 24, color: Colors.dark, textAlign: 'center' },
  accent: { color: '#059669', fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  fieldGroup: { marginBottom: 16 },
  label: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: Colors.secondary, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: Colors.dark,
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdown: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    marginTop: 4, overflow: 'hidden',
    ...(Platform.OS === 'web' ? { position: 'absolute' as any, top: 72, left: 0, right: 0, zIndex: 100 } : {}),
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + '40' },
  dropdownText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.dark },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBtn: {
    flexDirection: 'row', backgroundColor: '#059669', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  searchBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.white },
  disclaimer: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, textAlign: 'center', marginTop: 12 },
  results: { marginTop: 24 },
  resultsTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.dark, marginBottom: 12 },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  providerDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  providerName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.dark },
  providerDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.secondary, marginTop: 2 },
});
