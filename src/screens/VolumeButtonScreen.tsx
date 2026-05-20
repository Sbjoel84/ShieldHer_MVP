import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';

const STEPS = [
  {
    icon: 'volume-plus',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    label: 'Vol UP',
    description: 'Press the Volume Up button once firmly.',
  },
  {
    icon: 'volume-minus',
    color: '#7C3AED',
    bg: '#EDE9FE',
    label: 'Vol DOWN',
    description: 'Immediately press Volume Down once.',
  },
  {
    icon: 'volume-plus',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    label: 'Vol UP',
    description: 'Press Volume Up again — SOS fires instantly.',
  },
];

const HOW_IT_WORKS = [
  { icon: 'cellphone-lock', text: 'Works from lock screen — no need to unlock your phone.' },
  { icon: 'eye-off-outline', text: 'Completely discreet — looks like you\'re adjusting volume.' },
  { icon: 'pocket', text: 'Can be triggered with your phone in your pocket.' },
  { icon: 'timer-outline', text: 'All three presses must happen within 2 seconds.' },
  { icon: 'bell-ring-outline', text: 'Triggers the same SOS as shaking — full alert to your circle.' },
];

const WHY_NOT_YET = [
  {
    icon: 'shield-key-outline',
    title: 'OS Permission Required',
    body: 'Android requires a system-level accessibility permission to intercept hardware button presses while the screen is off. We\'re implementing this carefully to avoid draining your battery.',
  },
  {
    icon: 'apple',
    title: 'iOS Support',
    body: 'On iPhone, this will hook into AssistiveTouch or the Emergency SOS shortcut. Apple\'s APIs make this possible but require extra integration work.',
  },
  {
    icon: 'clock-fast',
    title: 'Coming in v1.1',
    body: 'This feature is in active development and is targeted for the next major release. Your safe word and settings are already being stored for when it goes live.',
  },
];

export function VolumeButtonScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconRow}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="volume-minus" size={28} color="#fff" />
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.5)" />
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="volume-plus" size={28} color="#fff" />
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.5)" />
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="volume-minus" size={28} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Volume Button Pattern</Text>
        <Text style={styles.heroSub}>
          Trigger an SOS using your volume buttons — no screen needed.
        </Text>
        <View style={styles.comingSoonBadge}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#1D4ED8" />
          <Text style={styles.comingSoonText}>Coming in v1.1</Text>
        </View>
      </View>

      {/* Pattern sequence */}
      <Text style={styles.sectionLabel}>The Pattern</Text>
      <View style={styles.patternRow}>
        {STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <View style={styles.patternStep}>
              <View style={[styles.patternIcon, { backgroundColor: step.bg }]}>
                <MaterialCommunityIcons name={step.icon as any} size={26} color={step.color} />
              </View>
              <Text style={[styles.patternLabel, { color: step.color }]}>{step.label}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} style={{ marginTop: 10 }} />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.timingBadge}>
        <MaterialCommunityIcons name="timer" size={14} color="#D97706" />
        <Text style={styles.timingText}>All 3 presses within 2 seconds</Text>
      </View>

      {/* Step by step */}
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

      {/* Why not yet */}
      <Text style={styles.sectionLabel}>Why Not Available Yet</Text>
      {WHY_NOT_YET.map((item, i) => (
        <View key={i} style={styles.reasonCard}>
          <View style={styles.reasonIconWrap}>
            <MaterialCommunityIcons name={item.icon as any} size={22} color="#1D4ED8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reasonTitle}>{item.title}</Text>
            <Text style={styles.reasonBody}>{item.body}</Text>
          </View>
        </View>
      ))}

      {/* Until then */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={18} color="#1D4ED8" />
        <Text style={styles.infoText}>
          While you wait, use the Shake-to-Alert or 5-Tap trigger — both are active now and work just as discreetly.
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
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#BFDBFE', textAlign: 'center', lineHeight: 20 },
    comingSoonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#DBEAFE',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginTop: 4,
    },
    comingSoonText: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },

    patternRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    patternStep: { alignItems: 'center', gap: 8 },
    patternIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    patternLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

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
      alignSelf: 'center',
    },
    timingText: { fontSize: 13, fontWeight: '600', color: '#D97706' },

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

    reasonCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    reasonIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    reasonTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    reasonBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

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
