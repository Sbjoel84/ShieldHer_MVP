import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Haptics from 'expo-haptics';
import { useContacts } from '../context/ContactsContext';
import { appendLog } from '../utils/activityLog';

type Phase = 'setup' | 'active' | 'alert';

const DURATIONS = [15, 30, 45, 60, 90];

export function JourneyTrackingScreen() {
  const { contacts } = useContacts();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('setup');
  const [destination, setDestination] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSecs = durationMin * 60;
  const remaining = Math.max(0, totalSecs - elapsed);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= totalSecs) {
          clearInterval(timerRef.current!);
          onTimerExpired();
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, totalSecs]);

  async function getLocationUrl() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'Location unavailable';
    const loc = await Location.getCurrentPositionAsync({});
    return `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
  }

  async function sendSMS(message: string) {
    if (contacts.length === 0) return;
    const isAvail = await SMS.isAvailableAsync();
    if (isAvail) {
      await SMS.sendSMSAsync(contacts.map(c => c.phone), message);
    }
  }

  async function onTimerExpired() {
    setPhase('alert');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const locUrl = await getLocationUrl();
    await sendSMS(
      `⏰ ALERT: I haven't checked in! I was heading to "${destination}".\nLocation: ${locUrl}\n— ShieldHer`,
    );
    appendLog({
      type: 'sos',
      title: 'Safe Walk Timer Expired',
      detail: `Did not arrive at "${destination}" within ${durationMin} min. Alert sent to ${contacts.length} contact(s).`,
    });
  }

  function startJourney() {
    if (!destination.trim()) {
      Alert.alert('Missing destination', 'Please enter where you are going.');
      return;
    }
    if (contacts.length === 0) {
      Alert.alert(
        'No contacts',
        'Add emergency contacts first so they can be notified if something goes wrong.',
      );
      return;
    }
    setElapsed(0);
    setPhase('active');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function markSafe() {
    if (timerRef.current) clearInterval(timerRef.current);
    const locUrl = await getLocationUrl();
    await sendSMS(
      `✅ I arrived safely at "${destination}"! ${locUrl}\n— ShieldHer`,
    );
    appendLog({
      type: 'journey',
      title: 'Safe Walk Completed',
      detail: `Arrived safely at "${destination}". Contacts notified.`,
    });
    setPhase('setup');
    setElapsed(0);
  }

  function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  // Alert phase
  if (phase === 'alert') {
    return (
      <View style={styles.alertContainer}>
        <MaterialCommunityIcons name="alert-circle" size={80} color="#dc2626" />
        <Text style={styles.alertTitle}>Timer Expired!</Text>
        <Text style={styles.alertBody}>
          You haven't checked in. Your contacts have been alerted with your location.
        </Text>
        <TouchableOpacity style={styles.safeBtn} onPress={markSafe}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
          <Text style={styles.safeBtnText}>I'm Safe — Arrived!</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sosBorderBtn}
          onPress={async () => {
            const locUrl = await getLocationUrl();
            await sendSMS(`🚨 EMERGENCY! I need help! Heading to "${destination}".\nLocation: ${locUrl}\n— ShieldHer`);
          }}
        >
          <Text style={styles.sosBorderBtnText}>Send Full SOS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active phase
  if (phase === 'active') {
    const pct = Math.min(1, elapsed / totalSecs);
    const progressWidth = `${Math.round(pct * 100)}%`;
    const isUrgent = remaining < 60;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fcf9f8' }}>
        <View style={[styles.activeHeader, isUrgent && { backgroundColor: '#dc2626' }, { paddingTop: insets.top + 20 }]}>
          <View style={styles.activeBadge}>
            <View style={[styles.activeDot, isUrgent && { backgroundColor: '#fca5a5' }]} />
            <Text style={styles.activeBadgeText}>{isUrgent ? 'Check In Soon!' : 'Journey Active'}</Text>
          </View>
          <Text style={styles.activeDestText}>→ {destination}</Text>
          <Text style={styles.activeContactsText}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} watching
          </Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={[styles.timerValue, isUrgent && { color: '#dc2626' }]}>
            {formatTime(remaining)}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth as any }, isUrgent && { backgroundColor: '#dc2626' }]} />
          </View>
          <Text style={styles.elapsedText}>Elapsed: {formatTime(elapsed)}</Text>
        </View>

        <View style={styles.activeActions}>
          <TouchableOpacity style={styles.safeBtn} onPress={markSafe} activeOpacity={0.85}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
            <Text style={styles.safeBtnText}>I Arrived Safely!</Text>
          </TouchableOpacity>
          <Text style={styles.safeHint}>
            Tap when you arrive — this notifies your contacts you're safe.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Setup phase
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fcf9f8' }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}>
      <Text style={styles.setupTitle}>Safe Walk</Text>
      <Text style={styles.setupSubtitle}>
        Share your journey with trusted contacts. If you don't check in on time, they'll be automatically alerted with your location.
      </Text>

      <Text style={styles.fieldLabel}>Where are you going?</Text>
      <TextInput
        style={styles.input}
        value={destination}
        onChangeText={setDestination}
        placeholder="e.g. School, Work, Home, Market..."
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.fieldLabel}>Expected travel time</Text>
      <View style={styles.durationRow}>
        {DURATIONS.map(min => (
          <TouchableOpacity
            key={min}
            style={[styles.durationChip, durationMin === min && styles.durationChipActive]}
            onPress={() => setDurationMin(min)}
          >
            <Text style={[styles.durationText, durationMin === min && styles.durationTextActive]}>
              {min}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.contactsRow, contacts.length === 0 && { borderColor: '#fca5a5', backgroundColor: '#fff1f1' }]}>
        <MaterialCommunityIcons
          name="account-group"
          size={20}
          color={contacts.length > 0 ? '#310065' : '#dc2626'}
        />
        <Text style={[styles.contactsText, contacts.length === 0 && { color: '#dc2626' }]}>
          {contacts.length > 0
            ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} will be notified`
            : 'No emergency contacts — add them first!'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.startBtn, contacts.length === 0 && { opacity: 0.5 }]}
        onPress={startJourney}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="walk" size={22} color="#fff" />
        <Text style={styles.startBtnText}>Start Safe Walk</Text>
      </TouchableOpacity>

      <View style={styles.howItWorksBox}>
        <Text style={styles.howItWorksTitle}>How it works</Text>
        {[
          { icon: 'map-marker-check', text: 'Set your destination and travel time' },
          { icon: 'account-group', text: 'Your contacts are notified you started' },
          { icon: 'check-circle', text: 'Tap "I Arrived" when you get there' },
          { icon: 'bell-alert', text: 'If you don\'t check in, contacts are auto-alerted' },
        ].map((item, i) => (
          <View key={i} style={styles.howItWorksRow}>
            <MaterialCommunityIcons name={item.icon as any} size={18} color="#7345b6" />
            <Text style={styles.howItWorksText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  setupTitle: { fontSize: 28, fontWeight: '800', color: '#310065', marginBottom: 8 },
  setupSubtitle: { fontSize: 15, color: '#4a4452', lineHeight: 22, marginBottom: 28 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1b1c1c', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: '#cdc3d4',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1b1c1c',
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#cdc3d4',
    backgroundColor: '#fff',
  },
  durationChipActive: { borderColor: '#310065', backgroundColor: '#eddcff' },
  durationText: { fontSize: 14, color: '#4a4452', fontWeight: '500' },
  durationTextActive: { color: '#310065', fontWeight: '700' },
  contactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0eded',
    borderWidth: 1.5,
    borderColor: '#cdc3d4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  contactsText: { fontSize: 14, color: '#4a4452', flex: 1 },
  startBtn: {
    backgroundColor: '#310065',
    borderRadius: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  howItWorksBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e2e1',
  },
  howItWorksTitle: { fontSize: 14, fontWeight: '700', color: '#1b1c1c', marginBottom: 4 },
  howItWorksRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howItWorksText: { fontSize: 13, color: '#4a4452', flex: 1 },
  // Active phase
  activeHeader: {
    backgroundColor: '#310065',
    padding: 24,
    paddingBottom: 28,
    gap: 6,
  },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  activeBadgeText: { color: '#d7baff', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  activeDestText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  activeContactsText: { color: '#d7baff', fontSize: 13 },
  timerCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timerLabel: { fontSize: 12, color: '#4a4452', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  timerValue: { fontSize: 56, fontWeight: '800', color: '#310065', fontVariant: ['tabular-nums'] },
  progressTrack: { width: '100%', height: 6, backgroundColor: '#eddcff', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#310065', borderRadius: 3 },
  elapsedText: { fontSize: 13, color: '#7c7483' },
  activeActions: { paddingHorizontal: 16, gap: 10 },
  safeBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  safeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  safeHint: { textAlign: 'center', fontSize: 13, color: '#4a4452', lineHeight: 19 },
  // Alert phase
  alertContainer: {
    flex: 1,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  alertTitle: { fontSize: 28, fontWeight: '800', color: '#dc2626', textAlign: 'center' },
  alertBody: { fontSize: 15, color: '#4a4452', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  sosBorderBtn: {
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  sosBorderBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
});
