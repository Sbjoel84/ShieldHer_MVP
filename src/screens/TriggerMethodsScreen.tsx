import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Method {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  steps: string[];
  available: boolean;
  badge?: string;
}

const METHODS: Method[] = [
  {
    id: 'shake',
    icon: 'vibrate',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    title: 'Shake-to-Alert',
    subtitle: 'Shake your phone 3 times rapidly',
    badge: 'Active',
    available: true,
    steps: [
      'Hold your phone firmly.',
      'Shake it sharply 3 times in quick succession.',
      'ShieldHer detects the motion and fires SOS instantly.',
      'Works even when the app is in the background.',
    ],
  },
  {
    id: 'tap',
    icon: 'gesture-tap',
    iconBg: '#FCE7F3',
    iconColor: '#BE185D',
    title: 'Hidden 5-Tap Trigger',
    subtitle: 'Tap the app name 5 times quickly',
    badge: 'Active',
    available: true,
    steps: [
      'Open ShieldHer to the Home screen.',
      'Tap the "ShieldHer" name in the top header 5 times within 2 seconds.',
      'SOS countdown starts immediately.',
      'Looks like you\'re just tapping the app — nobody notices.',
    ],
  },
  {
    id: 'checkin',
    icon: 'timer-alert-outline',
    iconBg: '#FEF9C3',
    iconColor: '#A16207',
    title: 'Check-In Timer Auto-SOS',
    subtitle: 'Set a timer — miss it, SOS fires',
    badge: 'Active',
    available: true,
    steps: [
      'Go to the Check-In Timer feature.',
      'Set your expected arrival time.',
      'If you don\'t tap "I\'m Safe" before the timer ends, SOS triggers automatically.',
      'Perfect for journeys where you may not be able to interact with your phone.',
    ],
  },
  {
    id: 'volume',
    icon: 'volume-high',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    title: 'Volume Button Pattern',
    subtitle: 'Press Vol Up → Vol Down → Vol Up',
    badge: 'Coming Soon',
    available: false,
    steps: [
      'Will allow triggering SOS by pressing: Volume Up, Volume Down, Volume Up in sequence.',
      'Activatable from lock screen or while the phone is in your pocket.',
      'Completely discreet — looks like you\'re adjusting volume.',
      'Requires a native OS permission update. Coming in the next release.',
    ],
  },
  {
    id: 'power',
    icon: 'power',
    iconBg: '#DCFCE7',
    iconColor: '#15803d',
    title: 'Power Button (3–5 Presses)',
    subtitle: 'Press power button rapidly 5 times',
    badge: 'Coming Soon',
    available: false,
    steps: [
      'Will trigger SOS when you press the power button 5 times quickly.',
      'Works from any app, lock screen, or pocket.',
      'Many Android devices support this natively — ShieldHer will hook into it.',
      'iOS version uses a similar AssistiveTouch mechanism. Coming in the next release.',
    ],
  },
  {
    id: 'voice',
    icon: 'microphone-outline',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    title: 'Voice Safe-Word',
    subtitle: 'Say your secret word to trigger SOS',
    badge: 'Coming Soon',
    available: false,
    steps: [
      'Set a custom safe-word (e.g. "Pineapple", "Code Red").',
      'ShieldHer listens in the background only when enabled.',
      'Speaking the word triggers a silent SOS.',
      'Ideal for situations where you cannot touch your phone at all.',
    ],
  },
];

function MethodCard({ method }: { method: Method }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, !method.available && styles.cardDisabled]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: method.iconBg }]}>
          <MaterialCommunityIcons name={method.icon as any} size={24} color={method.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.methodTitle, !method.available && styles.textDim]}>
              {method.title}
            </Text>
            {method.badge && (
              <View style={[
                styles.badge,
                method.available ? styles.badgeActive : styles.badgeSoon,
              ]}>
                <Text style={[
                  styles.badgeText,
                  method.available ? styles.badgeTextActive : styles.badgeTextSoon,
                ]}>
                  {method.badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.methodSub, !method.available && styles.textDim]}>
            {method.subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          {method.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: method.available ? method.iconBg : '#F3F4F6' }]}>
                <Text style={[styles.stepNumText, { color: method.available ? method.iconColor : '#9CA3AF' }]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.stepText, !method.available && styles.textDim]}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function TriggerMethodsScreen() {
  function testShake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Shake Test',
      'Shake detection is active. Try shaking your phone rapidly 3 times on the Home screen to trigger the SOS.',
      [{ text: 'Got it' }],
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header banner */}
      <View style={styles.heroBanner}>
        <MaterialCommunityIcons name="shield-lock" size={40} color="rgba(255,255,255,0.9)" />
        <Text style={styles.heroTitle}>Hidden Emergency Triggers</Text>
        <Text style={styles.heroSub}>
          Activate SOS discreetly — even when you can't open the app or speak freely.
        </Text>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#7C3AED" />
        <Text style={styles.infoText}>
          These methods let you call for help silently without alerting an attacker.
          Two methods are active now — more arrive in future updates.
        </Text>
      </View>

      {/* Test shake */}
      <TouchableOpacity style={styles.testBtn} onPress={testShake} activeOpacity={0.85}>
        <MaterialCommunityIcons name="vibrate" size={20} color="#fff" />
        <Text style={styles.testBtnText}>Test Shake Detection</Text>
      </TouchableOpacity>

      {/* Method cards */}
      <Text style={styles.sectionLabel}>All Trigger Methods</Text>
      {METHODS.map(m => <MethodCard key={m.id} method={m} />)}

      {/* Warning */}
      <View style={styles.warningBox}>
        <MaterialCommunityIcons name="alert-outline" size={18} color="#D97706" />
        <Text style={styles.warningText}>
          Always test these triggers in a safe environment first so you know exactly how they work in an emergency.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F5FF' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  heroBanner: {
    backgroundColor: '#3B0764',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 14, color: '#C4B5FD', textAlign: 'center', lineHeight: 20 },

  infoBox: {
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#4C1D95', lineHeight: 19 },

  testBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.65 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  methodTitle: { fontSize: 15, fontWeight: '700', color: '#1b1c1c' },
  methodSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  textDim: { color: '#9CA3AF' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeSoon: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: '#16a34a' },
  badgeTextSoon: { color: '#6B7280' },

  cardBody: {
    padding: 16,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 12, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
});
