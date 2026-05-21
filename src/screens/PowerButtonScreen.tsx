import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';
import { triggerSOS } from '../utils/triggerSOS';

const REQUIRED_TAPS = 5;
const WINDOW_MS = 3000;

const HOW_IT_WORKS = [
  { icon: 'eye-off-outline', text: 'Completely discreet — looks accidental from the outside.' },
  { icon: 'timer-sand', text: 'All 5 taps must land within 3 seconds. Slow taps reset the counter.' },
  { icon: 'bell-ring-outline', text: 'Fires the full SOS — SMS + your live location to your entire Trusted Circle.' },
  { icon: 'cellphone', text: 'Use the in-app button below to test it at any time.' },
];

export function PowerButtonScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [tapCount, setTapCount] = useState(0);
  const [firing, setFiring] = useState(false);
  const tapTimestamps = useRef<number[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulseButton = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const resetCounter = useCallback(() => {
    tapTimestamps.current = [];
    setTapCount(0);
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleTap = useCallback(async () => {
    if (firing) return;
    pulseButton();

    const now = Date.now();
    tapTimestamps.current.push(now);

    // Drop any taps older than the window
    tapTimestamps.current = tapTimestamps.current.filter(t => now - t <= WINDOW_MS);

    const count = tapTimestamps.current.length;
    setTapCount(count);

    if (resetTimer.current) clearTimeout(resetTimer.current);

    if (count >= REQUIRED_TAPS) {
      setFiring(true);
      tapTimestamps.current = [];
      setTapCount(0);

      const result = await triggerSOS();

      setFiring(false);
      if (result.success) {
        Alert.alert(
          '🚨 SOS Sent',
          `Emergency alert sent to ${result.contactCount} contact${result.contactCount !== 1 ? 's' : ''} with your location.`,
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          'No Contacts',
          'Add emergency contacts in your Trusted Circle before using SOS.',
          [{ text: 'OK' }],
        );
      }
    } else {
      // Auto-reset if no more taps in window
      resetTimer.current = setTimeout(resetCounter, WINDOW_MS);
    }
  }, [firing, pulseButton, resetCounter]);

  const progress = Math.min(tapCount / REQUIRED_TAPS, 1);

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroPresses}>
          {Array.from({ length: REQUIRED_TAPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pressCircle,
                i < tapCount && styles.pressCircleActive,
              ]}
            >
              <MaterialCommunityIcons
                name="power"
                size={22}
                color={i < tapCount ? '#fff' : 'rgba(255,255,255,0.5)'}
              />
              <Text style={styles.pressNum}>{i + 1}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.heroTitle}>Power Button (5 Taps)</Text>
        <Text style={styles.heroSub}>
          Tap the power button 5 times rapidly to fire an instant SOS — no unlocking required.
        </Text>
        <View style={styles.activeBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#16A34A" />
          <Text style={styles.activeText}>Active — tap below to test</Text>
        </View>
      </View>

      {/* Interactive trigger */}
      <Text style={styles.sectionLabel}>Tap to Trigger SOS</Text>
      <View style={styles.triggerCard}>
        <Text style={styles.triggerHint}>
          {firing ? 'Sending SOS...' : tapCount === 0 ? 'Tap the button 5 times quickly' : `${tapCount} of ${REQUIRED_TAPS} — keep going!`}
        </Text>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: REQUIRED_TAPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < tapCount && styles.dotActive]}
            />
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
        </View>

        {/* Power button */}
        <TouchableOpacity onPress={handleTap} activeOpacity={0.85} disabled={firing}>
          <Animated.View style={[styles.powerBtn, firing && styles.powerBtnFiring, { transform: [{ scale: scaleAnim }] }]}>
            <MaterialCommunityIcons name="power" size={52} color="#fff" />
            {tapCount > 0 && (
              <View style={styles.tapBadge}>
                <Text style={styles.tapBadgeText}>{tapCount}</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

        {tapCount > 0 && !firing && (
          <TouchableOpacity onPress={resetCounter} activeOpacity={0.7}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
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

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={18} color="#DC2626" />
        <Text style={styles.infoText}>
          After 5 rapid taps, ShieldHer immediately sends your GPS location and an emergency SMS to every contact in your Trusted Circle.
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
    pressCircleActive: { backgroundColor: '#DC2626' },
    pressNum: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', position: 'absolute', bottom: 4 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#FECACA', textAlign: 'center', lineHeight: 20 },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginTop: 4,
    },
    activeText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },

    triggerCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 16,
      borderWidth: 1.5,
      borderColor: '#DC2626',
    },
    triggerHint: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },

    dotsRow: { flexDirection: 'row', gap: 10 },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.chipBg,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    dotActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },

    progressBarBg: {
      width: '80%',
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.chipBg,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#DC2626',
      borderRadius: 3,
    },

    powerBtn: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 8,
    },
    powerBtnFiring: { backgroundColor: '#7C0020' },
    tapBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapBadgeText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },
    resetText: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },

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
