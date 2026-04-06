import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Animated, Easing, Linking, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { API_BASE, Endpoints } from '../constants/api';

const CATEGORIES = [
  { name: 'Flights', icon: 'plane', color: '#0066FF', tab: 'Flights' },
  { name: 'Hotels', icon: 'hotel', color: '#FF6B00', tab: 'Hotels' },
  { name: 'Packages', icon: 'cube', color: '#7C3AED', tab: 'Packages' },
  { name: 'Car Hire', icon: 'car', color: '#059669', tab: 'Cars' },
  { name: 'eSIM', icon: 'sim-card', color: '#DC2626', tab: 'More' },
  { name: 'Explore', icon: 'compass', color: '#0891B2', tab: 'More' },
];

function AnimatedCard({ index, children, onPress }: { index: number; children: React.ReactNode; onPress: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 100, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], width: '47%' }}>
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FloatingPlane() {
  const posY = useRef(new Animated.Value(0)).current;
  const posX = useRef(new Animated.Value(-5)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(posY, { toValue: -12, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(posX, { toValue: 5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(posY, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(posX, { toValue: -5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const rotateInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });

  return (
    <Animated.View style={{ transform: [{ translateY: posY }, { translateX: posX }, { rotate: rotateInterp }] }}>
      <Text style={{ fontSize: 42 }}>✈️</Text>
    </Animated.View>
  );
}

function PulsingGlobe() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.globeContainer}>
      <Animated.View style={[styles.globeRing, { transform: [{ scale }], opacity }]} />
      <Animated.View style={[styles.globeRing2, { transform: [{ scale }], opacity }]} />
      <Text style={{ fontSize: 48, zIndex: 2 }}>🌍</Text>
    </View>
  );
}

const POPULAR_DESTINATIONS = [
  { name: 'Barcelona', country: 'Spain', emoji: '🇪🇸', color: '#FF6B00' },
  { name: 'Dubai', country: 'UAE', emoji: '🇦🇪', color: '#0066FF' },
  { name: 'Tenerife', country: 'Spain', emoji: '🇪🇸', color: '#059669' },
  { name: 'Antalya', country: 'Turkey', emoji: '🇹🇷', color: '#DC2626' },
  { name: 'Maldives', country: 'Maldives', emoji: '🇲🇻', color: '#7C3AED' },
  { name: 'Paris', country: 'France', emoji: '🇫🇷', color: '#0891B2' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-20)).current;
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();
  }, []);

  const subscribe = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    try {
      await fetch(`${API_BASE}${Endpoints.subscribe}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
    } catch {
      Alert.alert('Error', 'Could not subscribe. Try again later.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
        <View style={styles.heroIconRow}>
          <FloatingPlane />
          <PulsingGlobe />
        </View>
        <Text style={styles.heroTitle}>
          Travel <Text style={styles.heroAccent}>Intelligently.</Text>
        </Text>
        <Text style={styles.heroSub}>
          Comparing 20+ providers in real-time to find your perfect escape.
        </Text>
      </Animated.View>

      {/* Category Grid */}
      <Text style={styles.sectionTitle}>What are you looking for?</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((cat, i) => (
          <AnimatedCard key={cat.name} index={i} onPress={() => navigation.navigate(cat.tab)}>
            <View style={[styles.iconCircle, { backgroundColor: cat.color + '15' }]}>
              <FontAwesome5 name={cat.icon} size={22} color={cat.color} />
            </View>
            <Text style={styles.cardLabel}>{cat.name}</Text>
          </AnimatedCard>
        ))}
      </View>

      {/* Trust bar */}
      <View style={styles.trustBar}>
        {[
          { icon: 'shield-alt', text: 'No hidden fees' },
          { icon: 'search-dollar', text: 'Real prices' },
          { icon: 'handshake', text: '21+ providers' },
        ].map((t, i) => (
          <View key={i} style={styles.trustItem}>
            <FontAwesome5 name={t.icon} size={16} color={Colors.primary} />
            <Text style={styles.trustText}>{t.text}</Text>
          </View>
        ))}
      </View>

      {/* Popular Destinations */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Popular Destinations</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {POPULAR_DESTINATIONS.map((dest) => (
          <TouchableOpacity
            key={dest.name}
            style={styles.destCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Flights')}
          >
            <Text style={{ fontSize: 32 }}>{dest.emoji}</Text>
            <Text style={styles.destName}>{dest.name}</Text>
            <Text style={styles.destCountry}>{dest.country}</Text>
            <View style={[styles.destBadge, { backgroundColor: dest.color + '15' }]}>
              <Text style={[styles.destBadgeText, { color: dest.color }]}>Explore →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Deal Alerts Signup */}
      <View style={styles.dealBox}>
        <FontAwesome5 name="bell" size={20} color={Colors.primary} style={{ marginBottom: 8 }} />
        <Text style={styles.dealTitle}>Never Miss a Deal</Text>
        <Text style={styles.dealSub}>Get price-drop alerts and exclusive offers straight to your inbox.</Text>
        {subscribed ? (
          <View style={styles.subscribedBox}>
            <FontAwesome5 name="check-circle" size={16} color="#059669" />
            <Text style={styles.subscribedText}>You're subscribed!</Text>
          </View>
        ) : (
          <View style={styles.dealForm}>
            <TextInput
              style={styles.dealInput}
              placeholder="Your email address"
              placeholderTextColor={Colors.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.dealBtn} activeOpacity={0.8} onPress={subscribe}>
              <Text style={styles.dealBtnText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  heroTitle: { fontFamily: 'Poppins_900Black', fontSize: 28, color: Colors.dark, textAlign: 'center' },
  heroAccent: { color: Colors.primary, fontStyle: 'italic' },
  heroSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  globeContainer: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
  globeRing: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: Colors.primary,
  },
  globeRing2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: Colors.dark, paddingHorizontal: 24, marginTop: 8, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: {
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
  destCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: 'center', width: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  destName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: Colors.dark, marginTop: 6 },
  destCountry: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, marginBottom: 8 },
  destBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  destBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  dealBox: {
    marginHorizontal: 20, marginTop: 28, backgroundColor: Colors.white, borderRadius: 20,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  dealTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: Colors.dark, marginBottom: 4 },
  dealSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.secondary, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  dealForm: { flexDirection: 'row', gap: 8, width: '100%' },
  dealInput: {
    flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: Colors.dark,
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dealBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  dealBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: Colors.white },
  subscribedBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subscribedText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#059669' },
});
