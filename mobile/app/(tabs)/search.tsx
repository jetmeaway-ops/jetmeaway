/**
 * Search tab — premium "galaxy" native home.
 *
 * Built from real Gemini-generated artwork (assets/galaxy/*): a drifting
 * galaxy + golden jet hero, a glass search bar, quick chips, and a 2×2
 * category grid where each tile is a slowly-swirling energy orb with a
 * centred frosted-glass medallion icon.
 *
 * Motion is all Reanimated (no live 3D engine — deliberately, to stay fast
 * and light): orbs rotate + breathe, the galaxy does a slow Ken-Burns
 * drift, the jet gently bobs.
 *
 * Navigation: search bar, chips and category tiles go straight to the real
 * comparison pages (/webview/{flights,hotels,cars,packages}). The webview
 * opens empty in-app (sticky last-search is suppressed when running inside
 * the native shell — see web src/lib/sticky-search.ts).
 *
 * App is dark-only by design (see src/theme).
 */

import { useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { spacing, radii } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

const C = {
  bg: '#06070e',
  txt: '#FFFFFF',
  txt2: '#AEB6CE',
  txt3: '#7C86A2',
  gold: '#FFC24B',
  blue: '#2F81FF',
};

const HERO = require('../../assets/galaxy/galaxy-hero.png');
const JET = require('../../assets/galaxy/jet.png');

type Cat = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  img: ReturnType<typeof require>;
  ring: string;
  glow: string;
  tint: string;
  dur: number;
  reverse?: boolean;
};

const CATEGORIES: Cat[] = [
  { id: 'flights',  label: 'Flights',  icon: 'airplane',  route: '/webview/flights',  img: require('../../assets/galaxy/cloud-flights-blue.png'),    ring: 'rgba(96,165,250,0.9)',  glow: '#3B82F6', tint: '#08152b', dur: 46000 },
  { id: 'hotels',   label: 'Hotels',   icon: 'bed',       route: '/webview/hotels',   img: require('../../assets/galaxy/cloud-hotels-orange.png'),   ring: 'rgba(255,138,61,0.95)', glow: '#FF5E62', tint: '#1a0c05', dur: 54000, reverse: true },
  { id: 'cars',     label: 'Cars',     icon: 'car-sport', route: '/webview/cars',     img: require('../../assets/galaxy/cloud-cars-green.png'),      ring: 'rgba(52,211,153,0.95)', glow: '#119C7A', tint: '#06160f', dur: 50000 },
  { id: 'packages', label: 'Packages', icon: 'cube',      route: '/webview/packages', img: require('../../assets/galaxy/cloud-packages-purple.png'), ring: 'rgba(192,132,252,0.95)',glow: '#7C3AED', tint: '#100a1e', dur: 58000, reverse: true },
];

const QUICK = ['Barcelona', 'Dubai', 'Tenerife', 'Antalya'];

type AffiliateRow = { slug: string; icon: keyof typeof Ionicons.glyphMap; title: string; body: string };
const AFFILIATE_ROWS: AffiliateRow[] = [
  { slug: 'esim', icon: 'wifi-outline', title: 'eSIM data', body: '150+ countries · install before you fly' },
  { slug: 'insurance', icon: 'shield-outline', title: 'Travel insurance', body: 'Single-trip, annual, family, adventure' },
  { slug: 'explore', icon: 'compass-outline', title: 'Tours & experiences', body: 'GetYourGuide and Viator' },
];

/** One category tile: a slowly swirling + breathing energy orb with a
 *  centred glass medallion. Each tile owns its own animation. */
function OrbTile({ cat, onPress }: { cat: Cat; onPress: () => void }) {
  const rot = useSharedValue(0);
  const sc = useSharedValue(1);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(cat.reverse ? -360 : 360, { duration: cat.dur, easing: Easing.linear }),
      -1,
      false,
    );
    sc.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: cat.dur / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: cat.dur / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rot);
      cancelAnimation(sc);
    };
  }, [cat.dur, cat.reverse, rot, sc]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }, { scale: sc.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cat.label}
      style={({ pressed }) => [styles.cat, { backgroundColor: cat.tint }, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.orbWrap, orbStyle]} pointerEvents="none">
        <Image source={cat.img} style={styles.orbImg} contentFit="contain" />
      </Animated.View>
      <BlurView intensity={24} tint="dark" style={[styles.medallion, { borderColor: cat.ring, shadowColor: cat.glow }]}>
        <Ionicons name={cat.icon} size={30} color="#fff" />
      </BlurView>
      <Text style={styles.catLabel}>{cat.label}</Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const go = useCallback(
    (route: string) => {
      haptics.light();
      router.push(route);
    },
    [router],
  );

  // Slow Ken-Burns drift on the galaxy hero.
  const drift = useSharedValue(0);
  // Gentle bob on the jet.
  const bob = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 60000, easing: Easing.inOut(Easing.quad) }), -1, true);
    bob.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(drift);
      cancelAnimation(bob);
    };
  }, [drift, bob]);

  const galaxyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.06 + drift.value * 0.06 },
      { rotate: `${drift.value * 1.4}deg` },
      { translateX: drift.value * -6 },
      { translateY: drift.value * 4 },
    ],
  }));

  const jetStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '-7deg' }, { translateY: -6 * bob.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, galaxyStyle]} pointerEvents="none">
            <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
          <Animated.View style={[styles.jet, jetStyle]} pointerEvents="none">
            <Image source={JET} style={styles.jetImg} contentFit="contain" />
          </Animated.View>
          <LinearGradient colors={['transparent', C.bg]} style={styles.heroFade} pointerEvents="none" />

          {/* slim brand row */}
          <View style={styles.brand} pointerEvents="none">
            <View style={styles.brandMark}>
              <Ionicons name="paper-plane" size={14} color="#0b1020" />
            </View>
            <Text style={styles.brandText}>JetMeAway</Text>
          </View>

          <View style={styles.heroText} pointerEvents="none">
            <Text style={styles.eyebrow}>UK&apos;S SMARTEST TRAVEL COMPARISON</Text>
            <Text style={styles.h1}>
              Find Your{'\n'}Perfect Trip{'\n'}for <Text style={styles.h1gold}>Less</Text>
            </Text>
            <Text style={styles.sub}>
              Compare flights, hotels, cars &amp; more from 15+ trusted providers.
            </Text>
          </View>
        </View>

        {/* ── GLASS SEARCH BAR ── */}
        <View style={styles.searchWrap}>
          <BlurView intensity={36} tint="dark" style={styles.searchBlur}>
            <Pressable
              onPress={() => go('/webview/flights')}
              accessibilityRole="button"
              accessibilityLabel="Search flights"
              style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
            >
              <View style={styles.origin}>
                <Ionicons name="airplane" size={14} color="#fff" />
                <Text style={styles.originText}>LON</Text>
                <Ionicons name="chevron-down" size={12} color={C.txt3} />
              </View>
              <Text style={styles.ph} numberOfLines={1}>Where will Scout take you?</Text>
              <LinearGradient colors={['#FF9A3C', '#FF5E00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.go}>
                <Ionicons name="search" size={15} color="#fff" />
                <Text style={styles.goText}>GO</Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </View>

        {/* ── CHIPS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable onPress={() => go('/webview/flights')} style={({ pressed }) => [styles.chip, styles.chipGold, pressed && styles.pressed]}>
            <Ionicons name="shuffle" size={13} color={C.gold} />
            <Text style={[styles.chipText, { color: C.gold }]}>Surprise me</Text>
          </Pressable>
          {QUICK.map((city) => (
            <Pressable key={city} onPress={() => go('/webview/flights')} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Ionicons name="location-outline" size={12} color={C.txt2} />
              <Text style={styles.chipText}>{city}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── CATEGORY GRID ── */}
        <Text style={styles.h2}>What are you booking?</Text>
        <View style={styles.gridWrap}>
          <View style={styles.cats}>
            {CATEGORIES.map((cat) => (
              <OrbTile key={cat.id} cat={cat} onPress={() => go(cat.route)} />
            ))}
          </View>
        </View>

        {/* ── MORE ── */}
        <Text style={styles.h2}>More in the app</Text>
        <View style={styles.rows}>
          {AFFILIATE_ROWS.map((row, i) => (
            <Pressable
              key={row.slug}
              onPress={() => go(`/webview/${row.slug}`)}
              accessibilityRole="link"
              accessibilityLabel={row.title}
              style={({ pressed }) => [styles.row, i < AFFILIATE_ROWS.length - 1 && styles.rowBorder, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIco}>
                <Ionicons name={row.icon} size={19} color={C.blue} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowBody}>{row.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.txt3} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.foot}>
          Prices locked at booking — we never call or email you for extra payment. No hidden fees.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: spacing.xxxl },
  pressed: { opacity: 0.85 },

  // hero
  hero: { height: 392, overflow: 'hidden' },
  jet: { position: 'absolute', left: 6, top: 206, zIndex: 6 },
  jetImg: { width: 210, height: 120 },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  brand: { position: 'absolute', top: 52, left: 20, zIndex: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFB347' },
  brandText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroText: { position: 'absolute', left: 22, top: 96, zIndex: 8 },
  eyebrow: { color: C.gold, fontSize: 11, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  h1: { color: '#fff', fontFamily: 'Poppins_900Black', fontSize: 41, lineHeight: 42, letterSpacing: -1, marginTop: 8, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 18 },
  h1gold: { color: C.gold },
  sub: { color: '#D6DCEE', fontSize: 13.5, lineHeight: 20, marginTop: 12, maxWidth: 250, fontFamily: 'Poppins_400Regular', textShadowColor: 'rgba(0,0,0,1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },

  // search bar
  searchWrap: { paddingHorizontal: 18, marginTop: -26, zIndex: 12 },
  searchBlur: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(120,160,255,0.22)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, paddingLeft: 12, backgroundColor: 'rgba(14,18,32,0.62)' },
  origin: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  originText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  ph: { flex: 1, color: '#9AA2BE', fontSize: 14, fontFamily: 'Poppins_400Regular' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 15 },
  goText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: '#fff' },

  // chips
  chips: { gap: 9, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  chipGold: { borderColor: 'rgba(255,194,75,0.4)', backgroundColor: 'rgba(255,194,75,0.08)' },
  chipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#D2D8EC' },

  // headings
  h2: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3, paddingHorizontal: 22, marginTop: 26 },

  // category grid
  gridWrap: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(10,13,24,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,194,75,0.22)',
  },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cat: {
    width: '47%',
    flexGrow: 1,
    height: 158,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orbWrap: { position: 'absolute', top: '-42%', left: '-42%', right: '-42%', bottom: '-42%', alignItems: 'center', justifyContent: 'center' },
  orbImg: { width: '100%', height: '100%' },
  medallion: {
    zIndex: 3,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOpacity: 0.55,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  catLabel: { zIndex: 3, color: '#fff', fontSize: 15, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 0.2, textShadowColor: 'rgba(0,0,0,1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },

  // rows
  rows: { marginHorizontal: 18, marginTop: 14, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  rowIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,129,255,0.16)' },
  rowText: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 14.5, fontFamily: 'Poppins_700Bold' },
  rowBody: { color: C.txt3, fontSize: 11.5, fontFamily: 'Poppins_400Regular', marginTop: 1 },

  foot: { color: '#5C6378', fontSize: 11, fontFamily: 'Poppins_400Regular', lineHeight: 16, textAlign: 'center', marginHorizontal: 24, marginTop: 18 },
});
