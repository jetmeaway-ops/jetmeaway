/**
 * Search tab — premium "galaxy" native home.
 *
 * Hero: a slowly drifting galaxy (Gemini art) with a gold airliner gliding
 * across it, headline, then straight into the category grid (no search bar /
 * chips — they were unwired and removed). Each category is a 3D pressable
 * button (Gemini-rendered) sitting on a dimmed, very-slowly-swirling energy
 * orb, with a soft-3D label.
 *
 * Motion is all Reanimated (no live 3D engine — deliberately, to stay fast
 * and light): plane flies across + loops, galaxy does a slow Ken-Burns
 * drift, orbs swirl very slowly behind the buttons.
 *
 * Navigation: buttons go straight to the real comparison pages
 * (/webview/{flights,hotels,cars,packages}). The webview opens empty in-app
 * (sticky last-search is suppressed inside the native shell — see web
 * src/lib/sticky-search.ts).
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
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { spacing } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

const C = {
  bg: '#06070e',
  txt: '#FFFFFF',
  txt3: '#7C86A2',
  gold: '#FFC24B',
  blue: '#2F81FF',
};

const HERO = require('../../assets/galaxy/galaxy-hero.png');
const PLANE = require('../../assets/galaxy/plane.png');

type Cat = {
  id: string;
  label: string;
  route: string;
  orb: ReturnType<typeof require>;
  btn: ReturnType<typeof require>;
  tint: string;
  dur: number;
  reverse?: boolean;
};

const CATEGORIES: Cat[] = [
  { id: 'flights',  label: 'Flights',  route: '/webview/flights',  orb: require('../../assets/galaxy/cloud-flights-blue.png'),    btn: require('../../assets/galaxy/button-flights.png'),  tint: '#08152b', dur: 290000 },
  { id: 'hotels',   label: 'Hotels',   route: '/webview/hotels',   orb: require('../../assets/galaxy/cloud-hotels-orange.png'),   btn: require('../../assets/galaxy/button-hotels.png'),   tint: '#1a0c05', dur: 320000, reverse: true },
  { id: 'cars',     label: 'Cars',     route: '/webview/cars',     orb: require('../../assets/galaxy/cloud-cars-green.png'),      btn: require('../../assets/galaxy/button-cars.png'),     tint: '#06160f', dur: 305000 },
  { id: 'packages', label: 'Packages', route: '/webview/packages', orb: require('../../assets/galaxy/cloud-packages-purple.png'), btn: require('../../assets/galaxy/button-packages.png'), tint: '#100a1e', dur: 340000, reverse: true },
];

type AffiliateRow = { slug: string; icon: keyof typeof Ionicons.glyphMap; title: string; body: string };
const AFFILIATE_ROWS: AffiliateRow[] = [
  { slug: 'esim', icon: 'wifi-outline', title: 'eSIM data', body: '150+ countries · install before you fly' },
  { slug: 'insurance', icon: 'shield-outline', title: 'Travel insurance', body: 'Single-trip, annual, family, adventure' },
  { slug: 'explore', icon: 'compass-outline', title: 'Tours & experiences', body: 'GetYourGuide and Viator' },
];

/** One category tile: a 3D pressable button on a dimmed, very-slowly-swirling
 *  energy orb, with a soft-3D label. Each tile owns its own orb animation. */
function OrbTile({ cat, onPress }: { cat: Cat; onPress: () => void }) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(
      withTiming(cat.reverse ? -360 : 360, { duration: cat.dur, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rot);
  }, [cat.dur, cat.reverse, rot]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cat.label}
      style={({ pressed }) => [styles.cat, { backgroundColor: cat.tint }, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.orbWrap, orbStyle]} pointerEvents="none">
        <Image source={cat.orb} style={styles.orbImg} contentFit="contain" />
      </Animated.View>
      <Image source={cat.btn} style={styles.btn3d} contentFit="contain" />
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
  // Plane flies left → right across the hero, then loops.
  const fly = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 48000, easing: Easing.inOut(Easing.quad) }), -1, true);
    fly.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(drift);
      cancelAnimation(fly);
    };
  }, [drift, fly]);

  // Galaxy sits a little lower (translateY base) + gentle drift.
  const galaxyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.value * -6 },
      { translateY: 30 + drift.value * 4 },
      { scale: 1.08 + drift.value * 0.06 },
      { rotate: `${drift.value * 1.4}deg` },
    ],
  }));

  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -340 + fly.value * 770 }, { rotate: '-7deg' }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, galaxyStyle]} pointerEvents="none">
            <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
          <Animated.View style={[styles.plane, planeStyle]} pointerEvents="none">
            <Image source={PLANE} style={styles.planeImg} contentFit="contain" />
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

        {/* ── CATEGORY GRID (3D buttons) ── */}
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
  plane: { position: 'absolute', left: 0, top: 232, zIndex: 6 },
  planeImg: { width: 300, height: 164 },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  brand: { position: 'absolute', top: 52, left: 20, zIndex: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFB347' },
  brandText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroText: { position: 'absolute', left: 22, top: 96, zIndex: 8 },
  eyebrow: { color: C.gold, fontSize: 11, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  h1: { color: '#fff', fontFamily: 'Poppins_900Black', fontSize: 41, lineHeight: 42, letterSpacing: -1, marginTop: 8, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 18 },
  h1gold: { color: C.gold },
  sub: { color: '#D6DCEE', fontSize: 13.5, lineHeight: 20, marginTop: 12, maxWidth: 250, fontFamily: 'Poppins_400Regular', textShadowColor: 'rgba(0,0,0,1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },

  // headings
  h2: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3, paddingHorizontal: 22, marginTop: 26 },

  // category grid — blank gaps (no frame)
  gridWrap: { marginHorizontal: 18, marginTop: 14 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cat: {
    width: '47%',
    flexGrow: 1,
    height: 184,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orbWrap: { position: 'absolute', top: '-42%', left: '-42%', right: '-42%', bottom: '-42%', alignItems: 'center', justifyContent: 'center', opacity: 0.42 },
  orbImg: { width: '100%', height: '100%' },
  btn3d: { zIndex: 3, width: 144, height: 144 },
  catLabel: { zIndex: 3, color: '#fff', fontSize: 17, fontFamily: 'Poppins_900Black', letterSpacing: 0.4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },

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
