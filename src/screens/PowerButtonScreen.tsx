import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';

const PRESS_COUNT = 5;

const HOW_IT_WORKS = [
  { icon: 'cellphone', text: 'Works from any screen — active app, lock screen, or even inside your pocket.' },
  { icon: 'eye-off-outline', text: 'Indistinguishable from accidentally pressing power — no one notices.' },
  { icon: 'timer-sand', text: 'All 5 presses must be within 3 seconds. A single slow press won\'t trigger it.' },
  { icon: 'bell-ring-outline', text: 'Fires the full SOS — SMS + location to your entire Trusted Circle.' },
];

const PLATFORM_NOTES = [
  {
    icon: 'android',
    color: '#15803d',
    bg: '#DCFCE7',
    title: 'Android',
    body: 'Many Android devices already support a 5-press power shortcut for emergency SOS. ShieldHer will hook into that system and add its own alert on top of it.',
  },
  {
    icon: 'apple',
    color: '#374151',
    bg: '#F1F5F9',
    title: 'iPhone',
    body: 'iOS\'s Emergency SOS (5 power presses) is already built in. ShieldHer will add an extra layer — sending your location and SMS to your circle before calling 112.',
  },
];

const COMING_STEPS = [
  { done: true,  label: 'Feature designed & spec\'d' },
  { done: true,  label: 'Android native module scaffolded' },
  { done: false, label: 'Accessibility permission integration' },
  { done: false, label: 'iOS AssistiveTouch hook' },
  { done: false, label: 'Beta testing & release' },
];

export function PowerButtonScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroPresses}>
          {Array.from({ length: PRESS_COUNT }).map((_, i) => (
            <View key={i} style={styles.pressCircle}>
              <MaterialCommunityIcons name="power" size={22} color="#fff" />
              <Text style={styles.pressNum}>{i + 1}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.heroTitle}>Power Button (3–5 Presses)</Text>
        <Text style={styles.heroSub}>
          Press the power button rapidly 5 times to fire an instant SOS — no unlocking required.
        </Text>
        <View style={styles.comingSoonBadge}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#DC2626" />
          <Text style={styles.comingSoonText}>Coming in v1.1</Text>
        </View>
      </View>

      {/* Press visualizer */}
      <Text style={styles.sectionLabel}>The Trigger</Text>
      <View style={styles.pressCard}>
        <View style={styles.pressRow}>
          {Array.from({ length: PRESS_COUNT }).map((_, i) => (
            <View key={i} style={styles.pressDot}>
              <MaterialCommunityIcons name="power" size={20} color="#DC2626" />
            </View>
          ))}
        </View>
        <Text style={styles.pressCaption}>5 rapid presses within 3 seconds</Text>
        <View style={styles.timingBadge}>
          <MaterialCommunityIcons name="lightning-bolt" size={14} color="#DC2626" />
          <Text style={styles.timingText}>Each press under 600ms apart</Text>
        </View>
      </View>

      {/* How it works */}
      <Text style={styles.sectionLabel}>How It Works</Text>
      <View style={styles.card}>
        {HOW_IT_WORKS.map((item, i) => (
          <View key={i} style={[styles.featureRow, i < HOW_IT_WORKS.length - 1 && styles.featureRowBorder]}>
            <View style={styles.featureIconWrap}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color="#DC2626" />
            </View>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Platform notes */}
      <Text style={styles.sectionLabel}>Platform Support</Text>
      {PLATFORM_NOTES.map((p, i) => (
        <View key={i} style={[styles.platformCard, isAndroid && p.icon === 'android' && styles.platformCardHighlight]}>
          <View style={[styles.platformIcon, { backgroundColor: p.bg }]}>
            <MaterialCommunityIcons name={p.icon as any} size={22} color={p.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.platformTitleRow}>
              <Text style={styles.platformTitle}>{p.title}</Text>
              {isAndroid && p.icon === 'android' && (
                <View style={styles.yourDeviceBadge}>
                  <Text style={styles.yourDeviceText}>Your device</Text>
                </View>
              )}
              {!isAndroid && p.icon === 'apple' && (
                <View style={styles.yourDeviceBadge}>
                  <Text style={styles.yourDeviceText}>Your device</Text>
                </View>
              )}
            </View>
            <Text style={styles.platformBody}>{p.body}</Text>
          </View>
        </View>
      ))}

      {/* Development progress */}
      <Text style={styles.sectionLabel}>Development Progress</Text>
      <View style={styles.progressCard}>
        {COMING_STEPS.map((step, i) => (
          <View key={i} style={[styles.progressRow, i < COMING_STEPS.length - 1 && styles.progressRowBorder]}>
            <View style={[styles.progressDot, step.done && styles.progressDotDone]}>
              <MaterialCommunityIcons
                name={step.done ? 'check' : 'clock-outline'}
                size={14}
                color={step.done ? '#fff' : colors.textMuted}
              />
            </View>
            <Text style={[styles.progressLabel, step.done && styles.progressLabelDone]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Until then */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={18} color="#DC2626" />
        <Text style={styles.infoText}>
          Until this launches, the Shake-to-Alert (3 shakes) and the 5-Tap trigger are both active and discreet — use them now.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 14, paddingBottom: 48 },

    hero: {
      backgroundColor: '#7C0020',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    heroPresses: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    pressCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressNum: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', position: 'absolute', bottom: 4 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#FECACA', textAlign: 'center', lineHeight: 20 },
    comingSoonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginTop: 4,
    },
    comingSoonText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },

    pressCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pressRow: { flexDirection: 'row', gap: 10 },
    pressDot: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressCaption: { fontSize: 14, fontWeight: '700', color: colors.text },
    timingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    timingText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
    featureRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    featureIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20, paddingTop: 2 },

    platformCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    platformCardHighlight: { borderColor: '#DC2626', borderWidth: 1.5 },
    platformIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    platformTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    platformTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    yourDeviceBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    yourDeviceText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
    platformBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

    progressCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    progressRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    progressDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressDotDone: { backgroundColor: '#16A34A' },
    progressLabel: { fontSize: 13, color: colors.textMuted },
    progressLabelDone: { color: colors.text, fontWeight: '600' },

    infoBox: {
      backgroundColor: '#FEE2E2',
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: '#7C0020', lineHeight: 19 },
  });
}
