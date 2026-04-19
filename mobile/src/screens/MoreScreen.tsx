import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Tab = 'esim' | 'insurance' | 'menu';

const ESIM_COUNTRIES = [
  'Spain', 'France', 'Italy', 'Turkey', 'Greece', 'Portugal', 'Morocco',
  'Thailand', 'USA', 'Mexico', 'Japan', 'UAE', 'Egypt', 'Indonesia',
  'Malaysia', 'India', 'Australia', 'Canada', 'Germany', 'Netherlands',
  'Croatia', 'Cyprus', 'Malta', 'Iceland', 'Norway', 'Sweden',
  'Brazil', 'Argentina', 'South Africa', 'Singapore', 'Philippines',
];

const ESIM_PROVIDERS = [
  { name: 'Airalo', color: '#FF6B00', desc: 'Most popular, instant activation' },
  { name: 'Yesim', color: '#059669', desc: 'Unlimited plans, includes calls/SMS' },
];

const INSURANCE_PROVIDERS = [
  { name: 'Ekta Traveling', color: '#059669', desc: '£3/day comprehensive cover' },
];

const COVER_TYPES = ['Single Trip', 'Annual Multi-Trip', 'Backpacker', 'Winter Sports'];
const REGIONS = ['Europe', 'Worldwide excl. USA', 'Worldwide incl. USA', 'UK Only'];

export default function MoreScreen() {
  const [tab, setTab] = useState<Tab>('menu');

  // eSIM state
  const [esimCountry, setEsimCountry] = useState('');
  const [esimSelected, setEsimSelected] = useState('');
  const [esimDuration, setEsimDuration] = useState('7 days');
  const [showCountryList, setShowCountryList] = useState(false);
  const [esimSearched, setEsimSearched] = useState(false);

  // Insurance state
  const [coverType, setCoverType] = useState('Single Trip');
  const [region, setRegion] = useState('Europe');
  const [insSearched, setInsSearched] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!esimCountry) return ESIM_COUNTRIES.slice(0, 6);
    const q = esimCountry.toLowerCase();
    return ESIM_COUNTRIES.filter(c => c.toLowerCase().includes(q));
  }, [esimCountry]);

  if (tab === 'menu') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>More Services</Text>
        {[
          { name: 'eSIM Data Plans', icon: 'sim-card', color: '#DC2626', desc: 'Stay connected — no roaming', tab: 'esim' as Tab },
          { name: 'Travel Insurance', icon: 'shield-alt', color: '#7C3AED', desc: 'Compare 6 insurance providers', tab: 'insurance' as Tab },
        ].map(item => (
          <TouchableOpacity key={item.name} style={styles.menuRow} activeOpacity={0.7} onPress={() => setTab(item.tab)}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <FontAwesome5 name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.name}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={12} color={Colors.secondary} />
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Quick Links */}
        {[
          { name: 'About JetMeAway', icon: 'info-circle', color: Colors.primary, url: 'https://jetmeaway.co.uk/about' },
          { name: 'Privacy Policy', icon: 'lock', color: '#8E95A9', url: 'https://jetmeaway.co.uk/privacy' },
          { name: 'Terms of Service', icon: 'file-contract', color: '#8E95A9', url: 'https://jetmeaway.co.uk/terms' },
          { name: 'Contact Us', icon: 'envelope', color: '#059669', url: 'https://jetmeaway.co.uk/contact' },
        ].map(item => (
          <TouchableOpacity key={item.name} style={styles.linkRow} activeOpacity={0.7}
            onPress={() => Linking.openURL(item.url)}>
            <FontAwesome5 name={item.icon} size={14} color={item.color} style={{ width: 24 }} />
            <Text style={styles.linkText}>{item.name}</Text>
            <FontAwesome5 name="external-link-alt" size={10} color={Colors.secondary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.websiteBtn} activeOpacity={0.8} onPress={() => Linking.openURL('https://jetmeaway.co.uk')}>
          <FontAwesome5 name="globe" size={14} color={Colors.primary} />
          <Text style={styles.websiteBtnText}>Visit jetmeaway.co.uk</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>JetMeAway v1.0.0 · Made in the UK</Text>
      </ScrollView>
    );
  }

  if (tab === 'esim') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setTab('menu')} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={14} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Stay Connected <Text style={[styles.accent, { color: '#DC2626' }]}>Anywhere</Text></Text>
        <Text style={styles.subtitle}>No roaming charges — data from $4.50</Text>

        <View style={[styles.fieldGroup, { zIndex: 10 }]}>
          <Text style={styles.label}>DESTINATION COUNTRY</Text>
          <TextInput style={styles.input} placeholder="Where are you travelling?" placeholderTextColor={Colors.secondary}
            value={esimCountry} onChangeText={(t) => { setEsimCountry(t); setEsimSelected(''); setShowCountryList(true); }}
            onFocus={() => setShowCountryList(true)} />
          {showCountryList && filteredCountries.length > 0 && !esimSelected && (
            <View style={styles.dropdown}>
              {filteredCountries.slice(0, 5).map(c => (
                <TouchableOpacity key={c} style={styles.dropdownItem}
                  onPress={() => { setEsimCountry(c); setEsimSelected(c); setShowCountryList(false); }}>
                  <Text style={styles.dropdownText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>TRIP DURATION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.pillRow}>
            {['3 days', '7 days', '14 days', '30 days'].map(d => (
              <TouchableOpacity key={d} style={[styles.pill, esimDuration === d && styles.pillActiveRed]} onPress={() => setEsimDuration(d)}>
                <Text style={[styles.pillText, esimDuration === d && styles.pillTextActiveRed]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#DC2626' }]} activeOpacity={0.8} onPress={() => setEsimSearched(true)}>
          <FontAwesome5 name="search" size={14} color={Colors.white} />
          <Text style={styles.searchBtnText}>Compare eSIM Plans</Text>
        </TouchableOpacity>

        {esimSearched && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>6 providers found</Text>
            {ESIM_PROVIDERS.map(p => (
              <TouchableOpacity key={p.name} style={styles.providerCard} activeOpacity={0.7}
                onPress={() => Linking.openURL('https://jetmeaway.co.uk/esim')}>
                <View style={[styles.providerDot, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Text style={styles.providerDesc}>{p.desc}</Text>
                </View>
                <FontAwesome5 name="external-link-alt" size={12} color="#DC2626" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // Insurance
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => setTab('menu')} style={styles.backBtn}>
        <FontAwesome5 name="arrow-left" size={14} color={Colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Travel <Text style={[styles.accent, { color: '#7C3AED' }]}>Insurance</Text></Text>
      <Text style={styles.subtitle}>Compare 6 providers for the best cover</Text>

      <Text style={styles.label}>COVER TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.pillRow}>
          {COVER_TYPES.map(c => (
            <TouchableOpacity key={c} style={[styles.pill, coverType === c && styles.pillActivePurple]} onPress={() => setCoverType(c)}>
              <Text style={[styles.pillText, coverType === c && styles.pillTextActivePurple]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>DESTINATION REGION</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={styles.pillRow}>
          {REGIONS.map(r => (
            <TouchableOpacity key={r} style={[styles.pill, region === r && styles.pillActivePurple]} onPress={() => setRegion(r)}>
              <Text style={[styles.pillText, region === r && styles.pillTextActivePurple]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#7C3AED' }]} activeOpacity={0.8} onPress={() => setInsSearched(true)}>
        <FontAwesome5 name="search" size={14} color={Colors.white} />
        <Text style={styles.searchBtnText}>Compare Insurance</Text>
      </TouchableOpacity>

      {insSearched && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>6 providers found</Text>
          {INSURANCE_PROVIDERS.map(p => (
            <TouchableOpacity key={p.name} style={styles.providerCard} activeOpacity={0.7}
              onPress={() => Linking.openURL('https://jetmeaway.co.uk/insurance')}>
              <View style={[styles.providerDot, { backgroundColor: p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerDesc}>{p.desc}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="#7C3AED" />
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
  accent: { fontStyle: 'italic' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: Colors.body, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.primary },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: Colors.dark },
  menuDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: Colors.secondary, marginTop: 2 },
  websiteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, marginTop: 20,
  },
  websiteBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.primary },
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
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  pillActiveRed: { borderColor: '#DC2626', backgroundColor: '#DC2626' + '15' },
  pillTextActiveRed: { color: '#DC2626' },
  pillActivePurple: { borderColor: '#7C3AED', backgroundColor: '#7C3AED' + '15' },
  pillTextActivePurple: { color: '#7C3AED' },
  pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: Colors.secondary },
  searchBtn: {
    flexDirection: 'row', borderRadius: 14, paddingVertical: 16,
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
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  linkText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: Colors.dark, flex: 1 },
  versionText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: Colors.secondary, textAlign: 'center', marginTop: 20 },
});
