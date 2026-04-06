import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Alert, Dimensions,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { API_BASE, Endpoints } from '../constants/api';

let MapView: any = null;
let Marker: any = null;
let LocationModule: any = null;

// Conditionally import native-only modules
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
  try {
    LocationModule = require('expo-location');
  } catch {}
}

interface NearbyHotel {
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
  lat?: number;
  lng?: number;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'London': { lat: 51.5074, lng: -0.1278 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  'Tenerife': { lat: 28.2916, lng: -16.6291 },
  'Malaga': { lat: 36.7213, lng: -4.4214 },
  'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Budapest': { lat: 47.4979, lng: 19.0402 },
  'Milan': { lat: 45.4642, lng: 9.1900 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },
  'Cancun': { lat: 21.1619, lng: -86.8515 },
};

function getNearestCity(lat: number, lng: number): string {
  let nearest = 'London';
  let minDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = city;
    }
  }
  return nearest;
}

function getDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export default function ExploreScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState('');
  const [hotels, setHotels] = useState<NearbyHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setLoading(true);
    setError('');

    if (Platform.OS === 'web') {
      // Use browser geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(coords);
            const nearestCity = getNearestCity(coords.lat, coords.lng);
            setCity(nearestCity);
            searchHotels(nearestCity);
          },
          () => {
            // Fallback to London
            setLocation({ lat: 51.5074, lng: -0.1278 });
            setCity('London');
            searchHotels('London');
          }
        );
      } else {
        setLocation({ lat: 51.5074, lng: -0.1278 });
        setCity('London');
        searchHotels('London');
      }
      return;
    }

    // Native
    if (!LocationModule) {
      setLocation({ lat: 51.5074, lng: -0.1278 });
      setCity('London');
      searchHotels('London');
      return;
    }

    try {
      const { status } = await LocationModule.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLocation({ lat: 51.5074, lng: -0.1278 });
        setCity('London');
        searchHotels('London');
        return;
      }
      const loc = await LocationModule.getCurrentPositionAsync({ accuracy: LocationModule.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      const nearestCity = getNearestCity(coords.lat, coords.lng);
      setCity(nearestCity);
      searchHotels(nearestCity);
    } catch {
      setLocation({ lat: 51.5074, lng: -0.1278 });
      setCity('London');
      searchHotels('London');
    }
  };

  const searchHotels = async (searchCity: string) => {
    try {
      const checkin = getDateStr(7);
      const checkout = getDateStr(10);
      const params = new URLSearchParams({
        city: searchCity, checkin, checkout,
        adults: '2', children: '0', rooms: '1',
      });
      const res = await fetch(`${API_BASE}${Endpoints.hotels}?${params}`);
      const json = await res.json();
      if (json.hotels && json.hotels.length > 0) {
        // Add approximate coordinates around city center
        const cityCoords = CITY_COORDS[searchCity] || { lat: 51.5074, lng: -0.1278 };
        const withCoords = json.hotels.map((h: NearbyHotel, i: number) => ({
          ...h,
          lat: cityCoords.lat + (Math.random() - 0.5) * 0.04,
          lng: cityCoords.lng + (Math.random() - 0.5) * 0.04,
        }));
        setHotels(withCoords);
      } else {
        setHotels([]);
      }
    } catch {
      setError('Could not load hotels. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchCity = (newCity: string) => {
    setCity(newCity);
    setLoading(true);
    setHotels([]);
    const coords = CITY_COORDS[newCity];
    if (coords) setLocation(coords);
    searchHotels(newCity);
  };

  const cheapest = hotels.length > 0 ? Math.min(...hotels.map(h => h.pricePerNight)) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore <Text style={styles.accent}>Nearby</Text></Text>
        {city ? (
          <View style={styles.locationRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color={Colors.primary} />
            <Text style={styles.locationText}>{city}</Text>
            {permissionDenied && <Text style={styles.approxText}>(approximate)</Text>}
          </View>
        ) : null}

        {/* Quick city chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={styles.chipRow}>
            {['London', 'Barcelona', 'Dubai', 'Paris', 'Rome', 'Istanbul', 'Amsterdam', 'Bangkok'].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, city === c && styles.chipActive]}
                onPress={() => searchCity(c)}
              >
                <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* View toggle */}
        {Platform.OS !== 'web' && MapView && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
              onPress={() => setViewMode('list')}
            >
              <FontAwesome5 name="list" size={12} color={viewMode === 'list' ? Colors.white : Colors.secondary} />
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]}
              onPress={() => setViewMode('map')}
            >
              <FontAwesome5 name="map" size={12} color={viewMode === 'map' ? Colors.white : Colors.secondary} />
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding hotels near you...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'map' && MapView && location ? (
        /* Map View (native only) */
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.lat,
              longitude: location.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={{
              latitude: CITY_COORDS[city]?.lat || location.lat,
              longitude: CITY_COORDS[city]?.lng || location.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {hotels.slice(0, 20).map((h, i) => (
              h.lat && h.lng ? (
                <Marker
                  key={h.id || i}
                  coordinate={{ latitude: h.lat, longitude: h.lng }}
                  title={h.name}
                  description={`£${h.pricePerNight}/night · ${h.stars}★`}
                />
              ) : null
            ))}
          </MapView>

          {/* Price overlay cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mapCards}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {hotels.slice(0, 10).map((h, i) => (
              <View key={h.id || i} style={styles.mapCard}>
                <Text style={styles.mapCardName} numberOfLines={1}>{h.name}</Text>
                <View style={styles.mapCardRow}>
                  <View style={styles.starsRow}>
                    {Array.from({ length: h.stars || 0 }).map((_, s) => (
                      <FontAwesome5 key={s} name="star" solid size={8} color="#FBBF24" />
                    ))}
                  </View>
                  <Text style={styles.mapCardPrice}>£{h.pricePerNight}<Text style={styles.perNight}>/nt</Text></Text>
                </View>
                {h.pricePerNight === cheapest && (
                  <View style={styles.cheapestBadge}>
                    <Text style={styles.cheapestText}>Cheapest</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        /* List View */
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.resultsCount}>{hotels.length} hotels found in {city}</Text>

          {hotels.slice(0, 20).map((h, i) => (
            <View key={h.id || i} style={styles.hotelCard}>
              <View style={styles.hotelTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hotelName} numberOfLines={2}>{h.name}</Text>
                  <View style={styles.starsRow}>
                    {Array.from({ length: h.stars || 0 }).map((_, s) => (
                      <FontAwesome5 key={s} name="star" solid size={10} color="#FBBF24" />
                    ))}
                  </View>
                </View>
                <View style={styles.priceBox}>
                  {h.pricePerNight === cheapest && (
                    <View style={styles.cheapestBadge}>
                      <Text style={styles.cheapestText}>Cheapest</Text>
                    </View>
                  )}
                  <Text style={styles.hotelPrice}>£{h.pricePerNight}</Text>
                  <Text style={styles.perNightSmall}>/night</Text>
                </View>
              </View>

              <View style={styles.hotelMeta}>
                {h.refundable !== undefined && (
                  <View style={[styles.metaBadge, { backgroundColor: h.refundable ? '#05966915' : '#DC262615' }]}>
                    <FontAwesome5 name={h.refundable ? 'check-circle' : 'times-circle'} size={10}
                      color={h.refundable ? '#059669' : '#DC2626'} />
                    <Text style={[styles.metaText, { color: h.refundable ? '#059669' : '#DC2626' }]}>
                      {h.refundable ? 'Free cancellation' : 'Non-refundable'}
                    </Text>
                  </View>
                )}
                {h.board && (
                  <View style={[styles.metaBadge, { backgroundColor: Colors.primary + '10' }]}>
                    <FontAwesome5 name="utensils" size={9} color={Colors.primary} />
                    <Text style={[styles.metaText, { color: Colors.primary }]}>{h.board}</Text>
                  </View>
                )}
                {h.provider && (
                  <View style={[styles.metaBadge, { backgroundColor: '#8E95A915' }]}>
                    <Text style={[styles.metaText, { color: '#8E95A9' }]}>via {h.provider}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: 'Poppins_900Black', fontSize: 22, color: Colors.dark, textAlign: 'center' },
  accent: { color: '#0891B2', fontStyle: 'italic' },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  locationText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.dark },
  approxText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { borderColor: '#0891B2', backgroundColor: '#0891B215' },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.secondary },
  chipTextActive: { color: '#0891B2' },
  toggleRow: { flexDirection: 'row', alignSelf: 'center', marginTop: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.secondary },
  toggleTextActive: { color: Colors.white },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.body, marginTop: 12 },
  errorText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: Colors.white },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapCards: { position: 'absolute', bottom: 20, left: 0, right: 0 },
  mapCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 12, width: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  mapCardName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: Colors.dark, marginBottom: 4 },
  mapCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapCardPrice: { fontFamily: 'Poppins_900Black', fontSize: 16, color: '#FF6B00' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  perNight: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: Colors.secondary },
  listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  resultsCount: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: Colors.dark, marginBottom: 12 },
  hotelCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  hotelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hotelName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.dark, marginBottom: 4, paddingRight: 12 },
  priceBox: { alignItems: 'flex-end' },
  hotelPrice: { fontFamily: 'Poppins_900Black', fontSize: 20, color: '#FF6B00' },
  perNightSmall: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary },
  hotelMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  cheapestBadge: { backgroundColor: '#059669', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  cheapestText: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: Colors.white },
});
