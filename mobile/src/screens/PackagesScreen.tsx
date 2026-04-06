import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DateInput from '../components/DateInput';

const UK_AIRPORTS = [
  'London Heathrow (LHR)', 'London Gatwick (LGW)', 'London Stansted (STN)',
  'London Luton (LTN)', 'Manchester (MAN)', 'Birmingham (BHX)',
  'Edinburgh (EDI)', 'Glasgow (GLA)', 'Bristol (BRS)', 'Liverpool (LPL)',
  'Newcastle (NCL)', 'Leeds Bradford (LBA)', 'Belfast (BFS)', 'Cardiff (CWL)',
];

const DESTINATIONS = [
  'Tenerife', 'Barcelona', 'Malaga', 'Palma', 'Alicante', 'Faro',
  'Antalya', 'Dubai', 'Cancun', 'Maldives', 'Marrakech', 'Paris',
  'Rome', 'Amsterdam', 'Prague', 'Budapest', 'Lisbon', 'Athens',
  'Gran Canaria', 'Lanzarote', 'Fuerteventura', 'Istanbul', 'Bali',
  'New York', 'Bangkok', 'Phuket', 'Rhodes', 'Crete', 'Corfu',
];

const DURATIONS = ['3 nights', '5 nights', '7 nights', '10 nights', '14 nights'];
const BOARDS = ['Any', 'Room Only', 'Half Board', 'Full Board', 'All Inclusive'];

const PROVIDERS = [
  {
    name: 'Expedia Packages', color: '#1A1A6C', desc: 'Flight + hotel bundles, price guarantee',
    buildUrl: (dest: string, dep: string, ret: string, adults: number) =>
      `https://www.expedia.co.uk/lp/packages-destinations?destination=${encodeURIComponent(dest)}&affcid=clbU3QK`,
  },
  {
    name: 'Trip.com', color: '#287DFA', desc: 'Global flight + hotel deals',
    buildUrl: (dest: string, dep: string, ret: string, adults: number) =>
      `https://www.trip.com/packages/list?from=&to=${encodeURIComponent(dest)}&startDate=${dep}&endDate=${ret}&adult=${adults}&Allianceid=8023009&SID=303363796&trip_sub3=D15021113`,
  },
];

export default function PackagesScreen() {
  const [from, setFrom] = useState('');
  const [dest, setDest] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [board, setBoard] = useState('Any');
  const [searched, setSearched] = useState(false);
  const [showFromList, setShowFromList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);

  const filteredFrom = useMemo(() => {
    if (!from) return UK_AIRPORTS.slice(0, 6);
    const q = from.toLowerCase();
    return UK_AIRPORTS.filter(a => a.toLowerCase().includes(q));
  }, [from]);

  const filteredDest = useMemo(() => {
    if (!dest) return DESTINATIONS.slice(0, 6);
    const q = dest.toLowerCase();
    return DESTINATIONS.filter(d => d.toLowerCase().includes(q));
  }, [dest]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Complete <Text style={styles.accent}>Holiday</Text> Packages</Text>
      <Text style={styles.subtitle}>Flight + hotel bundles — compare providers</Text>

      <View style={[styles.fieldGroup, { zIndex: 20 }]}>
        <Text style={styles.label}>FROM</Text>
        <TextInput style={styles.input} placeholder="Departure airport" placeholderTextColor={Colors.secondary}
          value={from} onChangeText={(t) => { setFrom(t); setShowFromList(true); }} onFocus={() => setShowFromList(true)} />
        {showFromList && filteredFrom.length > 0 && (
          <View style={styles.dropdown}>
            {filteredFrom.slice(0, 5).map(a => (
              <TouchableOpacity key={a} style={styles.dropdownItem} onPress={() => { setFrom(a); setShowFromList(false); }}>
                <Text style={styles.dropdownText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.fieldGroup, { zIndex: 10 }]}>
        <Text style={styles.label}>DESTINATION</Text>
        <TextInput style={styles.input} placeholder="Where do you want to go?" placeholderTextColor={Colors.secondary}
          value={dest} onChangeText={(t) => { setDest(t); setShowDestList(true); }} onFocus={() => setShowDestList(true)} />
        {showDestList && filteredDest.length > 0 && (
          <View style={styles.dropdown}>
            {filteredDest.slice(0, 5).map(d => (
              <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { setDest(d); setShowDestList(false); }}>
                <Text style={styles.dropdownText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <DateInput label="DEPARTURE" value={depDate} onChange={setDepDate} />
        </View>
        <View style={{ flex: 1 }}>
          <DateInput label="RETURN" value={retDate} onChange={setRetDate} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>ADULTS</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{adults}</Text>
            <TouchableOpacity onPress={() => setAdults(Math.min(6, adults + 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>CHILDREN</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => { const n = Math.max(0, children - 1); setChildren(n); setChildAges(a => a.slice(0, n)); }} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{children}</Text>
            <TouchableOpacity onPress={() => { const n = Math.min(6, children + 1); setChildren(n); setChildAges(a => [...a, 5].slice(0, n)); }} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {children > 0 && (
        <View style={styles.agesRow}>
          {childAges.map((age, i) => (
            <View key={i} style={styles.ageItem}>
              <Text style={styles.ageLabel}>Child {i + 1} age</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setChildAges(a => { const c = [...a]; c[i] = Math.max(0, c[i] - 1); return c; })} style={styles.stepBtn}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{age}</Text>
                <TouchableOpacity onPress={() => setChildAges(a => { const c = [...a]; c[i] = Math.min(17, c[i] + 1); return c; })} style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>BOARD TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={styles.pillRow}>
          {BOARDS.map(b => (
            <TouchableOpacity key={b} style={[styles.pill, board === b && styles.pillActive]} onPress={() => setBoard(b)}>
              <Text style={[styles.pillText, board === b && styles.pillTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={() => setSearched(true)}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Search Packages</Text>
      </TouchableOpacity>

      {searched && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Compare on these providers</Text>
          {PROVIDERS.map(p => (
            <TouchableOpacity key={p.name} style={styles.providerCard} activeOpacity={0.7}
              onPress={() => Linking.openURL(p.buildUrl(dest || 'Tenerife', depDate, retDate, adults))}>
              <View style={[styles.providerDot, { backgroundColor: p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerDesc}>{p.desc}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color={Colors.primary} />
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
  accent: { color: '#7C3AED', fontStyle: 'italic' },
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
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  stepBtn: { paddingHorizontal: 18, paddingVertical: 12 },
  stepText: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: Colors.primary },
  stepValue: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.dark, paddingHorizontal: 16 },
  agesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  ageItem: { width: '47%' },
  ageLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: Colors.secondary, marginBottom: 4 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  pillActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' + '15' },
  pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.secondary },
  pillTextActive: { color: '#7C3AED' },
  searchBtn: {
    flexDirection: 'row', backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  searchBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.white },
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
