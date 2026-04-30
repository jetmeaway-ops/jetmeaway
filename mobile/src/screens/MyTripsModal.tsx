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
import { fetchLiveSession } from '../services/auth';

const ACCOUNT_API = 'https://jetmeaway.co.uk/api/account/me';

type RemoteBooking = {
  id: string;
  type: 'flight' | 'hotel' | 'package';
  title?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalPence?: number;
  status?: string;
  paymentStatus?: string;
  supplierRef?: string;
  createdAt?: number;
};

/**
 * My Trips viewer — merges:
 *   1. Locally-saved bookings (AsyncStorage, available offline) — survives
 *      airplane mode at the airport.
 *   2. Remote bookings from /api/account/me — full account history when
 *      signed in. Fetched in parallel with the local list and merged by
 *      booking id (local wins for fields the remote doesn't carry, like
 *      hotel phone or full address).
 *
 * Logged-out users see only the local list. Logged-in users see the union.
 * The native side never blocks on the network — local renders first, remote
 * patches in when it arrives.
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
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoaded(false);

    // Local first — paints fast, works offline.
    listBookings().then((local) => {
      if (cancelled) return;
      setBookings(local);
      setLoaded(true);
    }).catch(() => { if (!cancelled) setLoaded(true); });

    // Remote second — patches in when it arrives. Only attempts when there's
    // a chance of being signed in (cookie sent automatically with credentials).
    (async () => {
      try {
        const email = await fetchLiveSession();
        if (cancelled) return;
        setSignedIn(!!email);
        if (!email) return;

        const res = await fetch(ACCOUNT_API, { credentials: 'include' });
        if (!res.ok) return;
        const data: { bookings?: RemoteBooking[] } = await res.json().catch(() => ({}));
        if (!Array.isArray(data?.bookings) || cancelled) return;

        const remote: SavedBooking[] = data.bookings.map((b) => ({
          id: b.id,
          type: b.type,
          title: b.title || b.destination || b.id,
          subtitle: typeof b.guests === 'number' ? `${b.guests} guest${b.guests === 1 ? '' : 's'}` : undefined,
          startDate: b.checkIn,
          endDate: b.checkOut,
          address: b.destination,
          total: typeof b.totalPence === 'number' ? `£${(b.totalPence / 100).toFixed(2)}` : undefined,
          url: `https://jetmeaway.co.uk/account/bookings#${b.id}`,
          savedAt: b.createdAt ?? Date.now(),
        }));

        // Merge by id — local wins for fields it carries that remote doesn't
        // (hotel phone, address). Remote wins when local is absent.
        setBookings((prev) => {
          const byId = new Map<string, SavedBooking>();
          for (const r of remote) byId.set(r.id, r);
          for (const l of prev) byId.set(l.id, { ...byId.get(l.id), ...l });
          return Array.from(byId.values()).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
        });
      } catch {
        // Network failure — local list is still showing, no UI disruption.
      }
    })();

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
                  {signedIn
                    ? 'When you complete a booking, it appears here automatically and stays available even without a signal — perfect for showing the receptionist on arrival.'
                    : 'Sign in to see your full booking history. Until then, completed bookings are saved on this device only and will appear here automatically.'}
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
