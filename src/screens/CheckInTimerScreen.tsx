import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useContacts } from '../context/ContactsContext';
import { appendLog } from '../utils/activityLog';

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

type Phase = 'setup' | 'active' | 'expired';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function getLocationMsg(): Promise<string> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return '';
    const loc = await Location.getCurrentPositionAsync({});
    return `\nLocation: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
  } catch {
    return '';
  }
}

export function CheckInTimerScreen() {
  const { contacts } = useContacts();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedMinutes, setSelectedMinutes] = useState(20);
  const [destination, setDestination] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sosSent, setSosSent] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const phaseRef = useRef<Phase>('setup');

  phaseRef.current = phase;

  const sendAutoSOS = useCallback(async () => {
    if (sosSent) return;
    setSosSent(true);

    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    const locMsg = await getLocationMsg();
    const destPart = destination.trim() ? ` She was travelling to: ${destination.trim()}.` : '';
    const message = `🚨 SOS — ShieldHer Check-In Timer expired!\n${destPart}\nShe has not confirmed her safety.${locMsg}\nPlease contact her immediately!`;

    const isAvail = await SMS.isAvailableAsync();
    if (isAvail && contacts.length > 0) {
      const phones = contacts.map(c => c.phone);
      await SMS.sendSMSAsync(phones, message);
    }
    appendLog({
      type: 'sos',
      title: 'Check-In Timer Expired — SOS Sent',
      detail: destination.trim()
        ? `Timer expired. Destination: ${destination.trim()}. Auto-SOS sent to ${contacts.length} contact(s).`
        : `Timer expired without check-in. Auto-SOS sent to ${contacts.length} contact(s).`,
    });
  }, [contacts, destination, sosSent]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    const totalSeconds = selectedMinutes * 60;
    secondsRef.current = totalSeconds;
    setSecondsLeft(totalSeconds);
    setPhase('active');
    setSosSent(false);

    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);

      if (secondsRef.current <= 0) {
        stopTimer();
        setPhase('expired');
        sendAutoSOS();
      } else if (secondsRef.current <= 60) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1000);
  }, [selectedMinutes, sendAutoSOS, stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  async function handleImSafe() {
    stopTimer();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const locMsg = await getLocationMsg();
    const destPart = destination.trim() ? ` She arrived at: ${destination.trim()}.` : '';
    const message = `✅ Safe arrival confirmed!${destPart}${locMsg}\n— ShieldHer Check-In`;

    const isAvail = await SMS.isAvailableAsync();
    if (isAvail && contacts.length > 0) {
      await SMS.sendSMSAsync(contacts.map(c => c.phone), message);
    }

    appendLog({
      type: 'checkin',
      title: 'Checked In Safely',
      detail: destination.trim() ? `Arrived at: ${destination.trim()}.` : 'Safe arrival confirmed via Check-In Timer.',
    });
    setPhase('setup');
    setDestination('');
    setSelectedMinutes(20);
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Timer',
      'Are you sure you want to cancel the check-in timer? No SOS will be sent.',
      [
        { text: 'Keep Timer', style: 'cancel' },
        {
          text: 'Cancel Timer',
          style: 'destructive',
          onPress: () => {
            stopTimer();
            setPhase('setup');
          },
        },
      ]
    );
  }

  async function handleSendSOS() {
    stopTimer();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const locMsg = await getLocationMsg();
    const destPart = destination.trim() ? ` Destination: ${destination.trim()}.` : '';
    const message = `🚨 EMERGENCY — SOS from ShieldHer!${destPart}${locMsg}\nPlease help immediately!`;
    const isAvail = await SMS.isAvailableAsync();
    if (isAvail && contacts.length > 0) {
      await SMS.sendSMSAsync(contacts.map(c => c.phone), message);
    }
    Alert.alert('SOS Sent', 'Emergency message sent to your trusted circle.');
    setPhase('setup');
  }

  const urgentThreshold = selectedMinutes * 60 * 0.15;
  const isUrgent = phase === 'active' && secondsLeft <= urgentThreshold;
  const progress = phase === 'active' ? secondsLeft / (selectedMinutes * 60) : 0;

  // ── EXPIRED PHASE ──────────────────────────────────────────────────────────
  if (phase === 'expired') {
    return (
      <View style={[styles.expiredContainer, { paddingTop: insets.top + 32 }]}>
        <View style={styles.expiredIconWrap}>
          <MaterialCommunityIcons name="alarm" size={64} color="#fff" />
        </View>
        <Text style={styles.expiredTitle}>Timer Expired!</Text>
        <Text style={styles.expiredBody}>
          {sosSent
            ? 'Your trusted circle has been alerted. Are you okay?'
            : 'Your check-in time has passed.'}
        </Text>

        <TouchableOpacity style={styles.safeBtn} onPress={handleImSafe} activeOpacity={0.85}>
          <MaterialCommunityIcons name="check-circle" size={28} color="#fff" />
          <Text style={styles.safeBtnText}>I'm Safe!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sosExpiredBtn} onPress={handleSendSOS} activeOpacity={0.85}>
          <MaterialCommunityIcons name="alarm-light" size={22} color="#fff" />
          <Text style={styles.sosExpiredBtnText}>Send Full SOS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── ACTIVE PHASE ───────────────────────────────────────────────────────────
  if (phase === 'active') {
    return (
      <View style={[styles.activeContainer, isUrgent && styles.activeContainerUrgent, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.activeLabel}>
          {isUrgent ? '⚠️ Almost time — confirm safety!' : 'Check-In Timer Active'}
        </Text>

        {destination.trim() ? (
          <View style={styles.destRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={isUrgent ? '#ffd6d6' : '#d7baff'} />
            <Text style={[styles.destText, isUrgent && { color: '#ffd6d6' }]}>{destination}</Text>
          </View>
        ) : null}

        {/* Progress ring approximation using a bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: progress }, isUrgent && { backgroundColor: '#ff6b6b' }]} />
          <View style={{ flex: 1 - progress }} />
        </View>

        <Text style={[styles.countdown, isUrgent && styles.countdownUrgent]}>
          {formatTime(secondsLeft)}
        </Text>
        <Text style={[styles.countdownSub, isUrgent && { color: '#ffd6d6' }]}>remaining</Text>

        <TouchableOpacity style={styles.imSafeBtn} onPress={handleImSafe} activeOpacity={0.85}>
          <MaterialCommunityIcons name="check-circle" size={32} color="#310065" />
          <Text style={styles.imSafeBtnText}>I'M SAFE!</Text>
        </TouchableOpacity>

        <View style={styles.activeSecondaryRow}>
          <TouchableOpacity style={styles.cancelTimerBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={[styles.cancelTimerText, isUrgent && { color: '#ffd6d6' }]}>Cancel Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendSosBtn} onPress={handleSendSOS} activeOpacity={0.85}>
            <MaterialCommunityIcons name="alarm-light" size={16} color="#fff" />
            <Text style={styles.sendSosBtnText}>Send SOS Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.activeContactsNote, isUrgent && { color: '#ffd6d6' }]}>
          {contacts.length > 0
            ? `Auto-alert → ${contacts.map(c => c.name.split(' ')[0]).join(', ')}`
            : 'No contacts set — add contacts for auto-alert'}
        </Text>
      </View>
    );
  }

  // ── SETUP PHASE ────────────────────────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fcf9f8' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerIconWrap}>
          <MaterialCommunityIcons name="timer-outline" size={32} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.headerTitle}>Check-In Timer</Text>
        <Text style={styles.headerSub}>
          Set a timer. If you don't confirm safety, your circle is alerted automatically.
        </Text>
      </View>

      <View style={{ padding: 20, gap: 24 }}>
        {/* Duration picker */}
        <View>
          <Text style={styles.sectionLabel}>How long until you arrive?</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map(min => (
              <TouchableOpacity
                key={min}
                style={[styles.durationChip, selectedMinutes === min && styles.durationChipActive]}
                onPress={() => setSelectedMinutes(min)}
                activeOpacity={0.75}
              >
                <Text style={[styles.durationChipText, selectedMinutes === min && styles.durationChipTextActive]}>
                  {min < 60 ? `${min}m` : '1hr'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination */}
        <View>
          <Text style={styles.sectionLabel}>Where are you going? (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Aunty Bisi's house, Lekki Phase 1"
            placeholderTextColor="#9ca3af"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        {/* Contacts info */}
        <View style={styles.contactsCard}>
          <MaterialCommunityIcons
            name={contacts.length > 0 ? 'account-group' : 'account-group-outline'}
            size={24}
            color={contacts.length > 0 ? '#310065' : '#9ca3af'}
          />
          <View style={{ flex: 1 }}>
            {contacts.length > 0 ? (
              <>
                <Text style={styles.contactsCardTitle}>
                  Alert will go to {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.contactsCardSub}>
                  {contacts.map(c => c.name.split(' ')[0]).join(', ')}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.contactsCardTitle, { color: '#9a3412' }]}>No contacts set</Text>
                <Text style={styles.contactsCardSub}>
                  Add trusted contacts in "My Circle" so they can be alerted.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#5b21b6" />
          <Text style={styles.infoText}>
            When the timer ends, ShieldHer sends your location to your trusted circle automatically.
            Tap "I'M SAFE!" at any time to cancel and send a safe arrival message.
          </Text>
        </View>

        {/* Start button */}
        <TouchableOpacity style={styles.startBtn} onPress={startTimer} activeOpacity={0.85}>
          <MaterialCommunityIcons name="timer-play-outline" size={24} color="#fff" />
          <Text style={styles.startBtnText}>Start {selectedMinutes}-Minute Timer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ── Setup ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#310065',
    padding: 24,
    gap: 8,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#d7baff', lineHeight: 20 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#4a4452', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cdc3d4',
    backgroundColor: '#fff',
    minWidth: 64,
    alignItems: 'center',
  },
  durationChipActive: { borderColor: '#310065', backgroundColor: '#eddcff' },
  durationChipText: { fontSize: 16, fontWeight: '700', color: '#4a4452' },
  durationChipTextActive: { color: '#310065' },

  input: {
    borderWidth: 1.5,
    borderColor: '#cdc3d4',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1b1c1c',
    backgroundColor: '#fff',
  },

  contactsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  contactsCardTitle: { fontSize: 15, fontWeight: '700', color: '#1b1c1c' },
  contactsCardSub: { fontSize: 13, color: '#4a4452', marginTop: 2 },

  infoCard: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#4c1d95', lineHeight: 19 },

  startBtn: {
    backgroundColor: '#310065',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  // ── Active ─────────────────────────────────────────────────────────────────
  activeContainer: {
    flex: 1,
    backgroundColor: '#310065',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  activeContainerUrgent: { backgroundColor: '#7c0020' },

  activeLabel: { fontSize: 15, color: '#d7baff', fontWeight: '600', textAlign: 'center' },

  destRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destText: { fontSize: 14, color: '#d7baff' },

  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#c084fc', borderRadius: 3 },

  countdown: { fontSize: 88, fontWeight: '900', color: '#fff', letterSpacing: -4, lineHeight: 96 },
  countdownUrgent: { color: '#ff6b6b' },
  countdownSub: { fontSize: 16, color: '#d7baff', marginTop: -8 },

  imSafeBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  imSafeBtnText: { color: '#fff', fontWeight: '900', fontSize: 26 },

  activeSecondaryRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelTimerBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  cancelTimerText: { color: '#d7baff', fontWeight: '600', fontSize: 14 },
  sendSosBtn: {
    flex: 1, padding: 14, alignItems: 'center', borderRadius: 12,
    backgroundColor: '#b80049', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  sendSosBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  activeContactsNote: { fontSize: 13, color: '#c084fc', textAlign: 'center', marginTop: 4 },

  // ── Expired ────────────────────────────────────────────────────────────────
  expiredContainer: {
    flex: 1,
    backgroundColor: '#1b0035',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  expiredIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#b80049',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  expiredTitle: { fontSize: 32, fontWeight: '900', color: '#fff' },
  expiredBody: { fontSize: 16, color: '#c084fc', textAlign: 'center', lineHeight: 24 },

  safeBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  safeBtnText: { color: '#fff', fontWeight: '900', fontSize: 24 },

  sosExpiredBtn: {
    backgroundColor: '#b80049',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  sosExpiredBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
