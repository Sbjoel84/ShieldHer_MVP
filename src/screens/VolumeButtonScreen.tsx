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

// Required sequence: Vol UP → Vol DOWN → Vol UP
const SEQUENCE = [
  { icon: 'volume-plus', color: '#1D4ED8', bg: '#DBEAFE', label: 'Vol UP' },
  { icon: 'volume-minus', color: '#7C3AED', bg: '#EDE9FE', label: 'Vol DOWN' },
  { icon: 'volume-plus', color: '#1D4ED8', bg: '#DBEAFE', label: 'Vol UP' },
] as const;

const STEP_TIMEOUT_MS = 2000;

const HOW_IT_WORKS = [
  { icon: 'eye-off-outline', text: 'Completely discreet — looks like adjusting volume.' },
  { icon: 'timer-outline', text: 'Each step must follow within 2 seconds — slow taps reset.' },
  { icon: 'bell-ring-outline', text: 'Fires the full SOS — SMS + live location to your Trusted Circle.' },
  { icon: 'cellphone', text: 'Tap the buttons below in order to test it now.' },
];

export function VolumeButtonScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0); // 0 = waiting, 1 = done step 1, 2 = done step 2, 3 = fired
  const [firing, setFiring] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnims = useRef(SEQUENCE.map(() => new Animated.Value(1))).current;

  const resetSequence = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    setStep(0);
  }, []);

  const pulseStep = useCallback((index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnims]);

  const handleStepTap = useCallback(async (tappedIndex: number) => {
    if (firing) return;
    if (tappedIndex !== step) {
      // Wrong button — reset
      resetSequence();
      return;
    }

    pulseStep(tappedIndex);
    if (stepTimer.current) clearTimeout(stepTimer.current);

    const nextStep = step + 1;

    if (nextStep >= SEQUENCE.length) {
      // Sequence complete — fire SOS
      setStep(nextStep);
      setFiring(true);

      const result = await triggerSOS();

      setFiring(false);
      setStep(0);

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
      setStep(nextStep);
      // Auto-reset if next step not tapped in time
      stepTimer.current = setTimeout(resetSequence, STEP_TIMEOUT_MS);
    }
  }, [firing, step, pulseStep, resetSequence]);

  const stepLabel = () => {
    if (firing) return 'Sending SOS...';
    if (step === 0) return 'Tap Vol UP to begin';
    if (step === 1) return 'Now tap Vol DOWN';
    if (step === 2) return 'Now tap Vol UP again!';
    return 'Done!';
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconRow}>
          {SEQUENCE.map((s, i) => (
            <React.Fragment key={i}>
              <View style={[styles.heroIconWrap, i < step && styles.heroIconDone]}>
                <MaterialCommunityIcons name={s.icon as any} size={28} color="#fff" />
              </View>
              {i < SEQUENCE.length - 1 && (
                <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.5)" />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.heroTitle}>Volume Button Pattern</Text>
        <Text style={styles.heroSub}>
          Press Vol UP → Vol DOWN → Vol UP to fire an instant SOS discreetly.
        </Text>
        <View style={styles.activeBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#16A34A" />
          <Text style={styles.activeText}>Active — tap below to test</Text>
        </View>
      </View>

      {/* Interactive sequence */}
      <Text style={styles.sectionLabel}>Tap in Sequence</Text>
      <View style={styles.triggerCard}>
        <Text style={styles.triggerHint}>{stepLabel()}</Text>

        {/* Step buttons */}
        <View style={styles.sequenceRow}>
          {SEQUENCE.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step && !firing;
            return (
              <React.Fragment key={i}>
                <TouchableOpacity
                  onPress={() => handleStepTap(i)}
                  activeOpacity={0.8}
                  disabled={firing}
                >
                  <Animated.View style={[
                    styles.seqBtn,
                    { backgroundColor: s.bg, transform: [{ scale: scaleAnims[i] }] },
                    isCurrent && styles.seqBtnActive,
                    isDone && styles.seqBtnDone,
                  ]}>
                    {isDone ? (
                      <MaterialCommunityIcons name="check" size={28} color="#16A34A" />
                    ) : (
                      <MaterialCommunityIcons name={s.icon as any} size={28} color={isCurrent ? '#fff' : s.color} />
                    )}
                    <Text style={[styles.seqLabel, isCurrent && { color: '#fff' }, isDone && { color: '#16A34A' }]}>
                      {s.label}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
                {i < SEQUENCE.length - 1 && (
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} style={{ marginTop: 16 }} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.timingBadge}>
          <MaterialCommunityIcons name="timer" size={14} color="#D97706" />
          <Text style={styles.timingText}>Each step within 2 seconds</Text>
        </View>

        {step > 0 && !firing && (
          <TouchableOpacity onPress={resetSequence} activeOpacity={0.7}>
            <Text style={styles.resetText}>Reset sequence</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* How it works */}
      <Text style={styles.sectionLabel}>How It Works</Text>
      <View style={styles.card}>
        {HOW_IT_WORKS.map((item, i) => (
          <View key={i} style={[styles.featureRow, i < HOW_IT_WORKS.length - 1 && styles.featureRowBorder]}>
            <View style={styles.featureIconWrap}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color="#1D4ED8" />
            </View>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={18} color="#1D4ED8" />
        <Text style={styles.infoText}>
          Complete the Vol UP → Vol DOWN → Vol UP pattern to instantly send your GPS location and SOS SMS to your entire Trusted Circle.
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
      backgroundColor: '#1E3A8A',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIconDone: { backgroundColor: '#16A34A' },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#BFDBFE', textAlign: 'center', lineHeight: 20 },
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
      padding: 20,
      alignItems: 'center',
      gap: 16,
      borderWidth: 1.5,
      borderColor: '#1D4ED8',
    },
    triggerHint: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },

    sequenceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    seqBtn: {
      width: 80,
      height: 88,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    seqBtnActive: {
      backgroundColor: '#1D4ED8',
      borderColor: '#1D4ED8',
      shadowColor: '#1D4ED8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    seqBtnDone: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
    seqLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, color: '#1D4ED8' },

    timingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    timingText: { fontSize: 13, fontWeight: '600', color: '#D97706' },

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
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20, paddingTop: 2 },

    infoBox: {
      backgroundColor: '#DBEAFE',
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 19 },
  });
}
