import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { API_BASE, Endpoints } from '../constants/api';

/* ── Airport data ── */
const UK_AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow' }, { code: 'LGW', name: 'London Gatwick' },
  { code: 'STN', name: 'London Stansted' }, { code: 'LTN', name: 'London Luton' },
  { code: 'MAN', name: 'Manchester' }, { code: 'BHX', name: 'Birmingham' },
  { code: 'EDI', name: 'Edinburgh' }, { code: 'GLA', name: 'Glasgow' },
  { code: 'BRS', name: 'Bristol' }, { code: 'LPL', name: 'Liverpool' },
  { code: 'NCL', name: 'Newcastle' }, { code: 'LBA', name: 'Leeds Bradford' },
  { code: 'BFS', name: 'Belfast International' }, { code: 'CWL', name: 'Cardiff' },
];

const DESTINATIONS = [
  { code: 'BCN', name: 'Barcelona' }, { code: 'AGP', name: 'Malaga' },
  { code: 'TFS', name: 'Tenerife' }, { code: 'PMI', name: 'Palma' },
  { code: 'ALC', name: 'Alicante' }, { code: 'FAO', name: 'Faro' },
  { code: 'LIS', name: 'Lisbon' }, { code: 'CDG', name: 'Paris' },
  { code: 'AMS', name: 'Amsterdam' }, { code: 'FCO', name: 'Rome' },
  { code: 'DXB', name: 'Dubai' }, { code: 'IST', name: 'Istanbul' },
  { code: 'AYT', name: 'Antalya' }, { code: 'ATH', name: 'Athens' },
  { code: 'BER', name: 'Berlin' }, { code: 'PRG', name: 'Prague' },
  { code: 'BUD', name: 'Budapest' }, { code: 'CPH', name: 'Copenhagen' },
  { code: 'RAK', name: 'Marrakech' }, { code: 'JFK', name: 'New York' },
  { code: 'MLE', name: 'Maldives' }, { code: 'BKK', name: 'Bangkok' },
  { code: 'LPA', name: 'Gran Canaria' }, { code: 'NCE', name: 'Nice' },
  { code: 'VCE', name: 'Venice' }, { code: 'MXP', name: 'Milan' },
  { code: 'KEF', name: 'Reykjavik' }, { code: 'MLA', name: 'Malta' },
];

const ALL_AIRPORTS = [...UK_AIRPORTS, ...DESTINATIONS];

interface Flight {
  airline: string;
  price: number;
  currency: string;
  transfers: number;
  departure: string;
  arrival: string;
  duration: string;
  returnDeparture?: string;
  returnArrival?: string;
  returnDuration?: string;
  source: string;
  link: string;
}

export default function FlightsScreen() {
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'return' | 'oneway'>('return');
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [error, setError] = useState('');
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);

  const filteredFrom = useMemo(() => {
    if (!fromText) return UK_AIRPORTS;
    const q = fromText.toLowerCase();
    return ALL_AIRPORTS.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [fromText]);

  const filteredTo = useMemo(() => {
    if (!toText) return DESTINATIONS.slice(0, 10);
    const q = toText.toLowerCase();
    return ALL_AIRPORTS.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [toText]);

  const search = async () => {
    if (!fromCode || !toCode || !departure) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    setFlights(null);
    try {
      const params = new URLSearchParams({
        origin: fromCode, destination: toCode, departure,
        adults: '1', cabin: 'economy',
      });
      if (tripType === 'return' && returnDate) params.set('return', returnDate);

      const res = await fetch(`${API_BASE}${Endpoints.flights}?${params}`);
      const json = await res.json();
      if (json.flights && json.flights.length > 0) {
        setFlights(json.flights);
      } else {
        setFlights([]);
      }
    } catch (e: any) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

      {/* FROM */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>FROM</Text>
        <TextInput
          style={styles.input}
          placeholder="City or airport — e.g. Manchester"
          placeholderTextColor={Colors.secondary}
          value={fromText}
          onChangeText={(t) => { setFromText(t); setFromCode(''); setShowFromList(true); }}
          onFocus={() => setShowFromList(true)}
        />
        {showFromList && filteredFrom.length > 0 && !fromCode && (
          <View style={styles.dropdown}>
            {filteredFrom.slice(0, 6).map((a) => (
              <TouchableOpacity key={a.code} style={styles.dropdownItem}
                onPress={() => { setFromText(`${a.name} (${a.code})`); setFromCode(a.code); setShowFromList(false); }}>
                <Text style={styles.dropdownText}>{a.name} <Text style={styles.dropdownCode}>({a.code})</Text></Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* TO */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>TO</Text>
        <TextInput
          style={styles.input}
          placeholder="City or airport — e.g. Barcelona"
          placeholderTextColor={Colors.secondary}
          value={toText}
          onChangeText={(t) => { setToText(t); setToCode(''); setShowToList(true); }}
          onFocus={() => setShowToList(true)}
        />
        {showToList && filteredTo.length > 0 && !toCode && (
          <View style={styles.dropdown}>
            {filteredTo.slice(0, 6).map((a) => (
              <TouchableOpacity key={a.code} style={styles.dropdownItem}
                onPress={() => { setToText(`${a.name} (${a.code})`); setToCode(a.code); setShowToList(false); }}>
                <Text style={styles.dropdownText}>{a.name} <Text style={styles.dropdownCode}>({a.code})</Text></Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Dates */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>DEPARTURE</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.secondary}
            value={departure}
            onChangeText={setDeparture}
          />
        </View>
        {tripType === 'return' && (
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>RETURN</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.secondary}
              value={returnDate}
              onChangeText={setReturnDate}
            />
          </View>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={search} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <FontAwesome5 name="search" size={14} color={Colors.white} />
            <Text style={styles.searchBtnText}>Search Flights</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Free comparison · Click any deal to book on the provider site</Text>

      {/* Results */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching 5 providers...</Text>
        </View>
      )}

      {flights && flights.length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No flights found for these dates. Try different dates or airports.</Text>
        </View>
      )}

      {flights && flights.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>{flights.length} flights found</Text>
          {flights.slice(0, 20).map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.flightCard, i === 0 && styles.cheapestCard]}
              activeOpacity={0.7}
              onPress={() => f.link && Linking.openURL(f.link)}
            >
              {i === 0 && <Text style={styles.cheapestBadge}>Cheapest</Text>}
              <View style={styles.flightHeader}>
                <Text style={styles.airline}>{f.airline}</Text>
                <Text style={styles.price}>£{f.price}</Text>
              </View>
              <View style={styles.flightDetails}>
                <Text style={styles.flightTime}>{f.departure} → {f.arrival}</Text>
                {f.duration ? <Text style={styles.flightDuration}>{f.duration}</Text> : null}
              </View>
              <View style={styles.flightMeta}>
                <Text style={styles.stops}>
                  {f.transfers === 0 ? 'Direct' : `${f.transfers} stop${f.transfers > 1 ? 's' : ''}`}
                </Text>
                <Text style={styles.source}>{f.source}</Text>
              </View>
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
  accent: { color: Colors.primary, fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  toggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  toggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.secondary },
  toggleTextActive: { color: Colors.primary },
  fieldGroup: { marginBottom: 16, zIndex: 10 },
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
  dropdownCode: { color: Colors.secondary },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  error: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.red, textAlign: 'center', marginBottom: 8 },
  searchBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  searchBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.white },
  disclaimer: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, textAlign: 'center', marginTop: 12 },
  loadingBox: { alignItems: 'center', marginTop: 32 },
  loadingText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.body, marginTop: 12 },
  noResults: { alignItems: 'center', marginTop: 32 },
  noResultsText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.secondary, textAlign: 'center' },
  results: { marginTop: 24 },
  resultsTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.dark, marginBottom: 12 },
  flightCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cheapestCard: { borderColor: Colors.green, borderWidth: 2 },
  cheapestBadge: {
    fontFamily: 'Poppins_700Bold', fontSize: 11, color: Colors.white,
    backgroundColor: Colors.green, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8, overflow: 'hidden',
  },
  flightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  airline: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.dark, flex: 1 },
  price: { fontFamily: 'Poppins_900Black', fontSize: 20, color: Colors.primary },
  flightDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  flightTime: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.body },
  flightDuration: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.secondary },
  flightMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  stops: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.green },
  source: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary },
});
