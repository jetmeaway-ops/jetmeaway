import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { API_BASE, Endpoints } from '../constants/api';
import DateInput from '../components/DateInput';

const CITIES = [
  'Barcelona', 'Dubai', 'London', 'Paris', 'Rome', 'Istanbul', 'Antalya',
  'Amsterdam', 'Lisbon', 'Prague', 'Tenerife', 'Malaga', 'Marrakech',
  'Athens', 'Budapest', 'Milan', 'Bangkok', 'Maldives', 'New York',
  'Cancun', 'Bali', 'Tokyo', 'Singapore', 'Vienna', 'Berlin', 'Nice',
  'Venice', 'Florence', 'Palma', 'Alicante', 'Faro', 'Gran Canaria',
  'Lanzarote', 'Rhodes', 'Crete', 'Corfu', 'Santorini', 'Mykonos',
  'Dubrovnik', 'Porto', 'Seville', 'Madrid', 'Ibiza', 'Paphos',
];

interface Hotel {
  id: string;
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  photo: string;
  location: string;
  provider: string;
  refundable?: boolean;
  board?: string;
}

export default function HotelsScreen() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [starFilter, setStarFilter] = useState('Any');
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [error, setError] = useState('');
  const [showCityList, setShowCityList] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');

  const filteredCities = useMemo(() => {
    if (!city) return CITIES.slice(0, 8);
    const q = city.toLowerCase();
    return CITIES.filter(c => c.toLowerCase().includes(q));
  }, [city]);

  const filteredHotels = useMemo(() => {
    if (!hotels) return null;
    if (starFilter === 'Any') return hotels;
    const min = parseInt(starFilter);
    return hotels.filter(h => h.stars >= min);
  }, [hotels, starFilter]);

  const search = async () => {
    if (!selectedCity || !checkin || !checkout) {
      setError('Please fill in city, check-in and check-out');
      return;
    }
    setError('');
    setLoading(true);
    setHotels(null);
    try {
      const params = new URLSearchParams({
        city: selectedCity, checkin, checkout,
        adults: String(adults), children: String(children), rooms: String(rooms),
      });
      const res = await fetch(`${API_BASE}${Endpoints.hotels}?${params}`);
      const json = await res.json();
      if (json.hotels && json.hotels.length > 0) {
        setHotels(json.hotels);
      } else {
        setHotels([]);
      }
    } catch (e: any) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayHotels = filteredHotels;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Find the <Text style={styles.accent}>Best</Text> Hotels</Text>
      <Text style={styles.subtitle}>Compare trusted hotel providers</Text>

      {/* City */}
      <View style={[styles.fieldGroup, { zIndex: 10 }]}>
        <Text style={styles.label}>DESTINATION</Text>
        <TextInput
          style={styles.input}
          placeholder="City — e.g. Barcelona, Dubai"
          placeholderTextColor={Colors.secondary}
          value={city}
          onChangeText={(t) => { setCity(t); setSelectedCity(''); setShowCityList(true); }}
          onFocus={() => setShowCityList(true)}
        />
        {showCityList && filteredCities.length > 0 && !selectedCity && (
          <View style={styles.dropdown}>
            {filteredCities.slice(0, 6).map((c) => (
              <TouchableOpacity key={c} style={styles.dropdownItem}
                onPress={() => { setCity(c); setSelectedCity(c); setShowCityList(false); }}>
                <Text style={styles.dropdownText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Dates */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <DateInput label="CHECK-IN" value={checkin} onChange={setCheckin} />
        </View>
        <View style={{ flex: 1 }}>
          <DateInput label="CHECK-OUT" value={checkout} onChange={setCheckout} />
        </View>
      </View>

      {/* Guests & Rooms */}
      <View style={styles.guestRow}>
        <View style={styles.guestItem}>
          <Text style={styles.label}>ADULTS</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{adults}</Text>
            <TouchableOpacity onPress={() => setAdults(Math.min(9, adults + 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.guestItem}>
          <Text style={styles.label}>CHILDREN</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setChildren(Math.max(0, children - 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{children}</Text>
            <TouchableOpacity onPress={() => setChildren(Math.min(6, children + 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.guestItem}>
          <Text style={styles.label}>ROOMS</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setRooms(Math.max(1, rooms - 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{rooms}</Text>
            <TouchableOpacity onPress={() => setRooms(Math.min(5, rooms + 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Star Rating Filter */}
      <Text style={styles.label}>HOTEL CLASS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={styles.starRow}>
          {['Any', '3', '4', '5'].map((s) => (
            <TouchableOpacity key={s} style={[styles.starBtn, starFilter === s && styles.starBtnActive]}
              onPress={() => setStarFilter(s)}>
              <Text style={[styles.starText, starFilter === s && styles.starTextActive]}>
                {s === 'Any' ? 'Any' : `${s}★+`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={search} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <FontAwesome5 name="search" size={14} color={Colors.white} />
            <Text style={styles.searchBtnText}>Search Hotels</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Free comparison · Prices shown here · Click any hotel to book on the provider</Text>

      {/* Results */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>Searching hotels...</Text>
        </View>
      )}

      {displayHotels && displayHotels.length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No hotels found. Try different dates or city.</Text>
        </View>
      )}

      {displayHotels && displayHotels.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>{displayHotels.length} hotels found</Text>
          {displayHotels.slice(0, 20).map((h, i) => (
            <View key={h.id || i} style={styles.hotelCard}>
              {h.photo ? (
                <Image source={{ uri: h.photo }} style={styles.hotelImage} />
              ) : (
                <View style={[styles.hotelImage, { backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                  <FontAwesome5 name="hotel" size={24} color={Colors.secondary} />
                </View>
              )}
              <View style={styles.hotelInfo}>
                <Text style={styles.hotelName} numberOfLines={2}>{h.name}</Text>
                <View style={styles.starsDisplayRow}>
                  {Array.from({ length: h.stars || 0 }).map((_, s) => (
                    <FontAwesome5 key={s} name="star" solid size={10} color="#FBBF24" />
                  ))}
                </View>
                {h.refundable !== undefined && (
                  <Text style={[styles.refundBadge, { color: h.refundable ? Colors.green : Colors.red }]}>
                    {h.refundable ? 'Free cancellation' : 'Non-refundable'}
                  </Text>
                )}
                {h.board && <Text style={styles.boardText}>{h.board}</Text>}
                <View style={styles.hotelPriceRow}>
                  <Text style={styles.hotelPrice}>£{h.pricePerNight}<Text style={styles.perNight}>/night</Text></Text>
                </View>
              </View>
            </View>
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
  accent: { color: '#FF6B00', fontStyle: 'italic' },
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
  guestRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  guestItem: { flex: 1 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  stepBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  stepText: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: Colors.orange },
  stepValue: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.dark, paddingHorizontal: 8 },
  starRow: { flexDirection: 'row', gap: 10 },
  starBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  starBtnActive: { borderColor: Colors.orange, backgroundColor: Colors.orange + '15' },
  starText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.body },
  starTextActive: { color: Colors.orange },
  error: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.red, textAlign: 'center', marginBottom: 8 },
  searchBtn: {
    flexDirection: 'row', backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16,
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
  hotelCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14,
    marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  hotelImage: { width: 110, height: 130 },
  hotelInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  hotelName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.dark, marginBottom: 4 },
  starsDisplayRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  refundBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginBottom: 2 },
  boardText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, marginBottom: 4 },
  hotelPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  hotelPrice: { fontFamily: 'Poppins_900Black', fontSize: 18, color: '#FF6B00' },
  perNight: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.secondary },
});
