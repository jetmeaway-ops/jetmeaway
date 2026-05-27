/**
 * Search tab — premium native home, mirroring the website hero with a
 * high-graphics treatment (gradient "sunset" hero, glassmorphic search bar,
 * gradient category cards, trending-destination cards, glass info rows).
 *
 * Navigation: the search bar, category cards, quick chips and trending
 * cards go STRAIGHT to the real comparison pages
 * (/webview/{flights,hotels,cars,packages} → jetmeaway.co.uk/<x>) — no
 * intermediate native form. The webview shell shows the native scouting
 * overlay so the hand-off still reads as native (Apple 4.2).
 *
 * Graphics: expo-linear-gradient (no radial in RN, so the sunset hero is
 * layered linear gradients + a soft sun disc) and expo-blur (BlurView) for
 * the frosted search bar. App is dark-only by design (see src/theme).
 */

import { useCallback } from 'react';
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
import { useRouter } from 'expo-router';

import { spacing, radii, typography } from '../../src/theme';
import { haptics } from '../../src/hooks/useHaptics';

// Premium palette — deeper than the base theme for a richer hero.
const C = {
  bg: '#0A0C14',
  card: '#141826',
  line: 'rgba(255,255,255,0.08)',
  txt: '#FFFFFF',
  txt2: '#AEB6CE',
  txt3: '#6F7896',
  blue: '#2F81FF',
  gold: '#FFC24B',
};

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  grad: [string, string];
};
const CATEGORIES: Category[] = [
  { id: 'flights', label: 'Flights', icon: 'airplane', route: '/webview/flights', grad: ['#3B8CFF', '#0052CC'] },
  { id: 'hotels', label: 'Hotels', icon: 'bed', route: '/webview/hotels', grad: ['#FF8A3D', '#FF5E62'] },
  { id: 'cars', label: 'Cars', icon: 'car-sport', route: '/webview/cars', grad: ['#2BD4A6', '#119C7A'] },
  { id: 'packages', label: 'Packages', icon: 'cube', route: '/webview/packages', grad: ['#B57BFF', '#7C3AED'] },
];

const STATS = [
  { v: '15+', l: 'Providers' },
  { v: '2M+', l: 'Hotels' },
  { v: '90s', l: 'Checkout' },
  { v: '24/7', l: 'AI Scout' },
];

const QUICK = ['Barcelona', 'Dubai', 'Tenerife', 'Antalya'];

type Trend = { city: string; price: string; meta: string; grad: [string, string] };
const TRENDING: Trend[] = [
  { city: 'Barcelona', price: '£19', meta: 'Direct · 2h 15m', grad: ['#FF7E5F', '#7C3AED'] },
  { city: 'Dubai', price: '£42', meta: 'Direct · 7h', grad: ['#2BC0E4', '#1A2980'] },
  { city: 'Tenerife', price: '£21', meta: 'Direct · 4h 20m', grad: ['#F7971E', '#e96443'] },
  { city: 'Antalya', price: '£29', meta: 'Direct · 4h', grad: ['#43cea2', '#185a9d'] },
];

type AffiliateRow = { slug: string; icon: keyof typeof Ionicons.glyphMap; title: string; body: string };
const AFFILIATE_ROWS: AffiliateRow[] = [
  { slug: 'esim', icon: 'wifi-outline', title: 'eSIM data', body: '150+ countries · install before you fly' },
  { slug: 'insurance', icon: 'shield-outline', title: 'Travel insurance', body: 'Single-trip, annual, family, adventure' },
  { slug: 'explore', icon: 'compass-outline', title: 'Tours & experiences', body: 'GetYourGuide and Viator' },
];

const STARS = [
  { left: '12%', top: 18 }, { left: '28%', top: 9 }, { left: '46%', top: 24 },
  { left: '67%', top: 12 }, { left: '82%', top: 30 }, { left: '90%', top: 16 },
  { left: '20%', top: 40 }, { left: '58%', top: 7 },
];

export default function SearchScreen() {
  const router = useRouter();
  const go = useCallback(
    (route: string) => {
      haptics.light();
      router.push(route);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#0b1330', '#0d1126', C.bg]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* warm horizon glow */}
          <LinearGradient
            colors={['rgba(255,160,50,0)', 'rgba(255,150,40,0.32)']}
            style={styles.horizon}
          />
          {/* soft sun disc */}
          <View style={styles.sunOuter} />
          <View style={styles.sunInner} />
          {/* blue + purple corner tints */}
          <View style={[styles.tint, { backgroundColor: 'rgba(47,129,255,0.30)', left: -40, top: -20 }]} />
          <View style={[styles.tint, { backgroundColor: 'rgba(168,85,247,0.28)', right: -40, top: -30 }]} />
          {STARS.map((s, i) => (
            <View key={i} style={[styles.star, { left: s.left as `${number}%`, top: s.top }]} />
          ))}

          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>UK&apos;S SMARTEST TRAVEL COMPARISON</Text>
            <Text style={styles.h1}>
              Find Your{'\n'}Perfect Trip{'\n'}for <Text style={styles.h1gold}>Less</Text>
            </Text>
            <Text style={styles.sub}>
              Compare flights, hotels, cars & more from 15+ trusted providers — real prices, in seconds.
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
              <LinearGradient colors={['#FF9A3C', '#FF6A00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.go}>
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

        {/* ── CATEGORIES ── */}
        <Text style={styles.h2}>What are you booking?</Text>
        <View style={styles.cats}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => go(cat.route)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              style={({ pressed }) => [styles.cat, pressed && styles.pressed]}
            >
              <LinearGradient colors={cat.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catIco}>
                <Ionicons name={cat.icon} size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── STATS ── */}
        <LinearGradient
          colors={['rgba(47,129,255,0.14)', 'rgba(124,58,237,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stats}
        >
          {STATS.map((s, i) => (
            <View key={s.l} style={[styles.stat, i > 0 && styles.statBorder]}>
              <Text style={styles.statV}>{s.v}</Text>
              <Text style={styles.statL}>{s.l}</Text>
            </View>
          ))}
        </LinearGradient>

        {/* ── TRENDING ── */}
        <View style={styles.secRow}>
          <Text style={styles.h2flat}>Trending now 🔥</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trending}>
          {TRENDING.map((t) => (
            <Pressable key={t.city} onPress={() => go('/webview/flights')} style={({ pressed }) => [pressed && styles.pressed]}>
              <LinearGradient colors={t.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dest}>
                <View style={styles.priceTag}><Text style={styles.priceText}>{t.price}</Text></View>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.destScrim} />
                <View style={styles.destText}>
                  <Text style={styles.destCity}>{t.city}</Text>
                  <Text style={styles.destMeta}>{t.meta}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

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

  // hero
  hero: { height: 360, paddingTop: 64, paddingHorizontal: 22, overflow: 'hidden' },
  horizon: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  sunOuter: { position: 'absolute', bottom: -70, alignSelf: 'center', left: '50%', marginLeft: -130, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,190,90,0.16)' },
  sunInner: { position: 'absolute', bottom: -30, alignSelf: 'center', left: '50%', marginLeft: -80, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,205,120,0.22)' },
  tint: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: '#fff', opacity: 0.7 },
  heroContent: { position: 'relative', zIndex: 5 },
  eyebrow: { color: C.gold, fontSize: 11, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 2 },
  h1: { color: '#fff', fontFamily: 'Poppins_900Black', fontSize: 40, lineHeight: 42, letterSpacing: -1, marginTop: 8 },
  h1gold: { color: C.gold },
  sub: { color: '#D6DCEE', fontSize: 14.5, lineHeight: 21, marginTop: 12, maxWidth: 300, fontFamily: 'Poppins_400Regular' },

  // search bar
  searchWrap: { paddingHorizontal: 18, marginTop: -34, zIndex: 10 },
  searchBlur: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, paddingLeft: 12, backgroundColor: 'rgba(26,30,46,0.55)' },
  origin: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 14 },
  originText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#fff' },
  ph: { flex: 1, color: '#9AA2BE', fontSize: 14.5, fontFamily: 'Poppins_400Regular' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 16 },
  goText: { fontFamily: 'Poppins_800ExtraBold', fontSize: 14, color: '#fff' },

  // chips
  chips: { gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  chipGold: { borderColor: 'rgba(255,194,75,0.45)', backgroundColor: 'rgba(255,194,75,0.08)' },
  chipText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#C7CDE2' },

  // section headings
  h2: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3, paddingHorizontal: 22, marginTop: 26 },
  h2flat: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.3 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 22, marginTop: 28 },
  seeAll: { color: C.blue, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  // categories
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 18, marginTop: 14 },
  cat: { width: '47%', flexGrow: 1, height: 96, borderRadius: 20, padding: 16, justifyContent: 'space-between', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  catIco: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catLabel: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },

  // stats
  stats: { flexDirection: 'row', marginHorizontal: 18, marginTop: 16, paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
  statV: { fontFamily: 'Poppins_800ExtraBold', fontSize: 21, color: '#fff' },
  statL: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', color: C.txt3, marginTop: 2 },

  // trending
  trending: { gap: 14, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 2 },
  dest: { width: 158, height: 200, borderRadius: 22, padding: 14, justifyContent: 'flex-end', overflow: 'hidden' },
  destScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  destText: { zIndex: 2 },
  destCity: { color: '#fff', fontFamily: 'Poppins_800ExtraBold', fontSize: 17 },
  destMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Poppins_600SemiBold', marginTop: 1 },
  priceTag: { position: 'absolute', top: 12, right: 12, zIndex: 3, backgroundColor: 'rgba(10,12,20,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.pill },
  priceText: { color: '#fff', fontFamily: 'Poppins_800ExtraBold', fontSize: 13 },

  // rows
  rows: { marginHorizontal: 18, marginTop: 14, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  rowIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(47,129,255,0.16)' },
  rowText: { flex: 1 },
  rowTitle: { color: '#fff', fontSize: 14.5, fontFamily: 'Poppins_700Bold' },
  rowBody: { color: C.txt3, fontSize: 11.5, fontFamily: 'Poppins_400Regular', marginTop: 1 },

  foot: { color: '#5C6378', fontSize: 11, fontFamily: 'Poppins_400Regular', lineHeight: 16, textAlign: 'center', marginHorizontal: 24, marginTop: 18 },

  pressed: { opacity: 0.85 },
});
