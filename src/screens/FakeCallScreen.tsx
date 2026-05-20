import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { appendLog } from '../utils/activityLog';
import { useTheme, ThemeColors } from '../theme';

type Phase = 'setup' | 'ringing' | 'active';

const QUICK_NAMES = ['Mom', 'Dad', 'Best Friend', 'Doctor'];

interface Props {
  onClose: () => void;
}

export function FakeCallScreen({ onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [callerName, setCallerName] = useState('Mom');
  const [callDuration, setCallDuration] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => cleanup();
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hapticRef.current) clearInterval(hapticRef.current);
    pulseLoopRef.current?.stop();
  }

  function startRinging() {
    setPhase('ringing');
    appendLog({
      type: 'fakecall',
      title: 'Fake Call Triggered',
      detail: `Fake incoming call from "${callerName}" used to escape a situation.`,
    });

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    hapticRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 2000);
  }

  function answerCall() {
    if (hapticRef.current) clearInterval(hapticRef.current);
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('active');
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }

  function decline() {
    cleanup();
    onClose();
  }

  function endCall() {
    cleanup();
    onClose();
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  if (phase === 'setup') {
    return (
      <View style={styles.setupContainer}>
        <StatusBar barStyle="dark-content" />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#4a4452" />
        </TouchableOpacity>

        <MaterialCommunityIcons name="phone-incoming" size={48} color={colors.accentText} style={{ marginBottom: 8 }} />
        <Text style={styles.setupTitle}>Fake Call</Text>
        <Text style={styles.setupSubtitle}>
          Trigger a convincing fake incoming call to escape an uncomfortable situation instantly.
        </Text>

        <Text style={styles.label}>Who is calling?</Text>
        <View style={styles.quickNames}>
          {QUICK_NAMES.map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.chip, callerName === n && styles.chipActive]}
              onPress={() => setCallerName(n)}
            >
              <Text style={[styles.chipText, callerName === n && styles.chipTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={callerName}
          onChangeText={setCallerName}
          placeholder="Or type a custom name..."
          placeholderTextColor="#9ca3af"
        />

        <TouchableOpacity style={styles.startBtn} onPress={startRinging} activeOpacity={0.85}>
          <MaterialCommunityIcons name="phone-ring" size={22} color="#fff" />
          <Text style={styles.startBtnText}>Start Fake Call</Text>
        </TouchableOpacity>

        <View style={styles.tipBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#7345b6" />
          <Text style={styles.tipText}>
            Tip: Put your phone to your ear and leave the situation naturally.
          </Text>
        </View>
      </View>
    );
  }

  // Ringing & Active share the dark call UI
  return (
    <View style={styles.callContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0620" />

      <Text style={styles.callStatus}>
        {phase === 'ringing' ? 'Incoming Call' : 'ShieldHer — Fake Call'}
      </Text>

      <Animated.View
        style={[styles.callerRing, phase === 'ringing' && { transform: [{ scale: pulseAnim }] }]}
      >
        <View style={styles.callerAvatar}>
          <Text style={styles.callerInitial}>{callerName.charAt(0).toUpperCase()}</Text>
        </View>
      </Animated.View>

      <Text style={styles.callerName}>{callerName}</Text>

      {phase === 'ringing' ? (
        <>
          <Text style={styles.callSubtext}>Incoming call...</Text>
          <View style={styles.ringActions}>
            <View style={styles.callActionCol}>
              <TouchableOpacity style={[styles.callBtn, styles.declineBtn]} onPress={decline}>
                <MaterialCommunityIcons name="phone-hangup" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.callActionLabel}>Decline</Text>
            </View>
            <View style={styles.callActionCol}>
              <TouchableOpacity style={[styles.callBtn, styles.answerBtn]} onPress={answerCall}>
                <MaterialCommunityIcons name="phone" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.callActionLabel}>Answer</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.callTimer}>{formatDuration(callDuration)}</Text>

          <View style={styles.activeOptions}>
            <View style={styles.callActionCol}>
              <TouchableOpacity style={styles.callOptionBtn}>
                <MaterialCommunityIcons name="microphone-off" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.optionLabel}>Mute</Text>
            </View>
            <View style={styles.callActionCol}>
              <TouchableOpacity style={styles.callOptionBtn}>
                <MaterialCommunityIcons name="volume-high" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.optionLabel}>Speaker</Text>
            </View>
            <View style={styles.callActionCol}>
              <TouchableOpacity style={styles.callOptionBtn}>
                <MaterialCommunityIcons name="dialpad" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.optionLabel}>Keypad</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.callBtn, styles.declineBtn, { marginTop: 32 }]} onPress={endCall}>
            <MaterialCommunityIcons name="phone-hangup" size={30} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.callActionLabel}>End Call</Text>
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    setupContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      paddingTop: 56,
    },
    closeBtn: {
      position: 'absolute',
      top: 52,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setupTitle: { fontSize: 28, fontWeight: '800', color: colors.accentText, marginBottom: 8 },
    setupSubtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 28 },
    label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    quickNames: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.chipBorder,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: '#310065', backgroundColor: '#eddcff' },
    chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: '#310065', fontWeight: '700' },
    input: {
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBg,
      marginBottom: 20,
    },
    startBtn: {
      backgroundColor: '#310065',
      borderRadius: 16,
      padding: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 16,
    },
    startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    tipBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#eddcff',
      padding: 14,
      borderRadius: 12,
    },
    tipText: { fontSize: 13, color: '#4a4452', flex: 1, lineHeight: 19 },
    // Call UI — intentionally dark, brand colors unchanged
    callContainer: {
      flex: 1,
      backgroundColor: '#0f0620',
      alignItems: 'center',
      paddingTop: 72,
      paddingBottom: 64,
    },
    callStatus: {
      color: '#a89cab',
      fontSize: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 36,
    },
    callerRing: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(215,186,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    callerAvatar: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: '#310065',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#d7baff',
    },
    callerInitial: { fontSize: 52, fontWeight: '800', color: '#eddcff' },
    callerName: { fontSize: 30, fontWeight: '700', color: '#fff', marginBottom: 6 },
    callSubtext: { fontSize: 16, color: '#a89cab', marginBottom: 'auto' as any },
    callTimer: { fontSize: 20, color: '#cdc3d4', marginBottom: 32, fontVariant: ['tabular-nums'] },
    ringActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 72,
      marginTop: 'auto' as any,
    },
    callActionCol: { alignItems: 'center', gap: 10 },
    callBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    answerBtn: { backgroundColor: '#16a34a' },
    declineBtn: { backgroundColor: '#dc2626' },
    callActionLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },
    activeOptions: {
      flexDirection: 'row',
      gap: 36,
      marginBottom: 16,
    },
    callOptionBtn: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionLabel: { color: '#a89cab', fontSize: 12, marginTop: 4 },
  });
}
