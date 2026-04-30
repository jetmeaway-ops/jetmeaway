import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { Colors } from '../constants/colors';
import { listBookings, type SavedBooking } from '../services/offline-bookings';

/**
 * My Trips offline viewer — list of locally-stored booking confirmations,
 * available without an internet connection. The headline native feature for
 * the App Store Guideline 4.2 case.
 *
 * Triggered from a small floating button in the bottom-right of the WebView,
 * or programmatically from the web side via window.JetMeAwayNative.openMyTrips()
 * (not yet wired — placeholder for a future iteration).
 */

export function MyTripsModal({
  visible,
  onClose,
  onOpenBooking,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenBooking: (url: string) => void;
}) {
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoaded(false);
    listBookings()
      .then((rows) => {
        if (!cancelled) {
          setBookings(rows);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [visible]);

  const handleOpen = useCallback((b: SavedBooking) => {
    onOpenBooking(b.url);
    onClose();
  }, [onOpenBooking, onClose]);

  const handleCallHotel = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>My Trips</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Your saved booking confirmations — accessible offline.
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {!loaded ? (
              <Text style={styles.empty}>Loading…</Text>
            ) : bookings.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No saved trips yet</Text>
                <Text style={styles.empty}>
                  When you complete a booking, it appears here automatically and stays available even
                  without a signal — perfect for showing the receptionist on arrival.
                </Text>
              </View>
            ) : (
              bookings.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.card}
                  onPress={() => handleOpen(b)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardLabel}>{b.type.toUpperCase()} · {b.id}</Text>
                  <Text style={styles.cardTitle}>{b.title}</Text>
                  {b.subtitle ? <Text style={styles.cardSubtitle}>{b.subtitle}</Text> : null}
                  {b.startDate ? (
                    <Text style={styles.cardDates}>
                      {b.startDate}{b.endDate ? ` → ${b.endDate}` : ''}
                    </Text>
                  ) : null}
                  {b.address ? <Text style={styles.cardMeta}>{b.address}</Text> : null}
                  <View style={styles.cardActions}>
                    {b.phone ? (
                      <TouchableOpacity
                        onPress={() => handleCallHotel(b.phone!)}
                        style={styles.callBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${b.title}`}
                      >
                        <Text style={styles.callText}>Call hotel</Text>
                      </TouchableOpacity>
                    ) : null}
                    {b.total ? <Text style={styles.cardTotal}>{b.total}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 48, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    minHeight: '60%',
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '900', color: Colors.dark, fontFamily: 'Poppins_900Black' },
  closeText: { fontSize: 14, fontWeight: '700', color: Colors.primary, fontFamily: 'Poppins_700Bold' },
  subtitle: { fontSize: 13, color: Colors.body, marginBottom: 16, fontFamily: 'Poppins_600SemiBold' },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  empty: { fontSize: 14, color: Colors.body, textAlign: 'center', lineHeight: 20 },
  emptyWrap: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginBottom: 8, fontFamily: 'Poppins_800ExtraBold' },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: Colors.primary, marginBottom: 4, fontFamily: 'Poppins_900Black' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, marginBottom: 4, fontFamily: 'Poppins_800ExtraBold' },
  cardSubtitle: { fontSize: 13, color: Colors.body, marginBottom: 4, fontFamily: 'Poppins_600SemiBold' },
  cardDates: { fontSize: 13, color: Colors.dark, fontWeight: '700', marginBottom: 4, fontFamily: 'Poppins_700Bold' },
  cardMeta: { fontSize: 12, color: Colors.secondary, marginBottom: 8, fontFamily: 'Poppins_400Regular' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  callBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  callText: { color: Colors.white, fontSize: 12, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold' },
  cardTotal: { fontSize: 14, color: Colors.dark, fontWeight: '800', fontFamily: 'Poppins_800ExtraBold' },
});
