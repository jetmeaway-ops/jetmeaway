import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const CATEGORIES = [
  { name: 'Flights', icon: 'plane', color: '#0066FF', tab: 'Flights' },
  { name: 'Hotels', icon: 'hotel', color: '#FF6B00', tab: 'Hotels' },
  { name: 'Packages', icon: 'cube', color: '#7C3AED', tab: 'Packages' },
  { name: 'Car Hire', icon: 'car', color: '#059669', tab: 'Cars' },
  { name: 'eSIM', icon: 'sim-card', color: '#DC2626', tab: 'More' },
  { name: 'Explore', icon: 'compass', color: '#0891B2', tab: 'More' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Travel <Text style={styles.heroAccent}>Intelligently.</Text>
        </Text>
        <Text style={styles.heroSub}>
          Comparing 20+ providers in real-time to find your perfect escape.
        </Text>
      </View>

      {/* Category Grid */}
      <Text style={styles.sectionTitle}>What are you looking for?</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(cat.tab)}
          >
            <View style={[styles.iconCircle, { backgroundColor: cat.color + '15' }]}>
              <FontAwesome5 name={cat.icon} size={22} color={cat.color} />
            </View>
            <Text style={styles.cardLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trust bar */}
      <View style={styles.trustBar}>
        <View style={styles.trustItem}>
          <FontAwesome5 name="shield-alt" size={16} color={Colors.primary} />
          <Text style={styles.trustText}>No hidden fees</Text>
        </View>
        <View style={styles.trustItem}>
          <FontAwesome5 name="search-dollar" size={16} color={Colors.primary} />
          <Text style={styles.trustText}>Real prices</Text>
        </View>
        <View style={styles.trustItem}>
          <FontAwesome5 name="handshake" size={16} color={Colors.primary} />
          <Text style={styles.trustText}>21+ providers</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  hero: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  heroTitle: { fontFamily: 'Poppins_900Black', fontSize: 28, color: Colors.dark, textAlign: 'center' },
  heroAccent: { color: Colors.primary, fontStyle: 'italic' },
  heroSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: Colors.dark, paddingHorizontal: 24, marginTop: 8, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.dark },
  trustBar: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 32, paddingHorizontal: 16 },
  trustItem: { alignItems: 'center', gap: 6 },
  trustText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: Colors.secondary },
});
