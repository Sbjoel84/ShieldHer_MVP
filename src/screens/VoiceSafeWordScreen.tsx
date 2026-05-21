import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useTheme, ThemeColors } from '../theme';
import { triggerSOS } from '../utils/triggerSOS';

const SAFE_WORD_KEY = '@shieldher_safe_word_v1';
const LISTEN_SECONDS = 10;
const AMPLITUDE_THRESHOLD = -35; // dBFS — picks up clear speech

const SUGGESTED_WORDS = ['Pineapple', 'Code Red', 'Sunflower', 'Umbrella', 'Jupiter'];

const TIPS = [
  { icon: 'incognito', text: 'Choose a word you would never say in normal conversation.' },
  { icon: 'ear-hearing', text: 'Make it easy to say clearly even when panicked or whispering.' },
  { icon: 'lock-outline', text: 'Keep it private — only you should know it.' },
  { icon: 'shield-star-outline', text: 'Avoid names of people, places, or common objects you discuss daily.' },
];

export function VoiceSafeWordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [safeWord, setSafeWord] = useState('');
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const [listening, setListening] = useState(false);
  const [countdown, setCountdown] = useState(LISTEN_SECONDS);
  const [detected, setDetected] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const load = useCallback(async () => {
    try {
      const w = await AsyncStorage.getItem(SAFE_WORD_KEY);
      if (w) { setSafeWord(w); setSaved(w); }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Clean up on unmount
  useEffect(() => {
    return () => { stopListening(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }

  async function startListening() {
    if (listening) return;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access', 'Allow microphone access so ShieldHer can listen for your safe-word.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recordingRef.current = recording;

      setListening(true);
      setDetected(false);
      setCountdown(LISTEN_SECONDS);
      startPulse();

      // Countdown
      let secondsLeft = LISTEN_SECONDS;
      countdownInterval.current = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft);
        if (secondsLeft <= 0) stopListening(false);
      }, 1000);

      // Amplitude monitoring
      meteringInterval.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync();
          if (
            status.isRecording &&
            typeof status.metering === 'number' &&
            status.metering > AMPLITUDE_THRESHOLD
          ) {
            await onVoiceDetected();
          }
        } catch {}
      }, 300);
    } catch (e) {
      Alert.alert('Error', 'Could not start microphone. Please try again.');
    }
  }

  async function onVoiceDetected() {
    await stopListening(false);
    setDetected(true);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const result = await triggerSOS();

    if (result.success) {
      Alert.alert(
        '🚨 SOS Sent',
        `Voice trigger detected!\nEmergency alert sent to ${result.contactCount} contact${result.contactCount !== 1 ? 's' : ''} with your location.`,
        [{ text: 'OK', onPress: () => setDetected(false) }],
      );
    } else {
      Alert.alert(
        'Voice Detected — No Contacts',
        'Add emergency contacts in your Trusted Circle before using SOS.',
        [{ text: 'OK', onPress: () => setDetected(false) }],
      );
    }
  }

  async function stopListening(silent: boolean) {
    if (meteringInterval.current) { clearInterval(meteringInterval.current); meteringInterval.current = null; }
    if (countdownInterval.current) { clearInterval(countdownInterval.current); countdownInterval.current = null; }
    stopPulse();
    setListening(false);
    setCountdown(LISTEN_SECONDS);

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch {}

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }

  async function saveWord() {
    const word = input.trim();
    if (!word) { Alert.alert('Empty', 'Please type a safe-word first.'); return; }
    if (word.length < 3) { Alert.alert('Too short', 'Choose a word with at least 3 characters.'); return; }
    try {
      await AsyncStorage.setItem(SAFE_WORD_KEY, word);
      setSafeWord(word);
      setSaved(word);
      setEditing(false);
      setInput('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not save your safe-word. Please try again.');
    }
  }

  function startEdit() { setInput(safeWord); setEditing(true); }
  function cancelEdit() { setEditing(false); setInput(''); }

  function clearWord() {
    Alert.alert('Clear Safe-Word', 'Remove your saved safe-word?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(SAFE_WORD_KEY);
          setSafeWord(''); setSaved('');
        },
      },
    ]);
  }

  const isWordSet = saved.length > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <Animated.View style={[styles.heroIconWrap, listening && { transform: [{ scale: pulseAnim }] }]}>
          <MaterialCommunityIcons
            name={listening ? 'microphone' : 'microphone-outline'}
            size={40}
            color="#fff"
          />
        </Animated.View>
        <Text style={styles.heroTitle}>Voice Safe-Word</Text>
        <Text style={styles.heroSub}>
          Say your secret word to silently trigger SOS — even when you can't touch your phone.
        </Text>
        <View style={styles.activeBadge}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#16A34A" />
          <Text style={styles.activeText}>Active — set your word &amp; test below</Text>
        </View>
      </View>

      {/* Safe Word Setup */}
      <View style={styles.setupCard}>
        <View style={styles.setupHeader}>
          <MaterialCommunityIcons name="key-variant" size={20} color="#7C3AED" />
          <Text style={styles.setupTitle}>Set Your Safe-Word</Text>
        </View>
        <Text style={styles.setupBody}>
          Your word is stored privately on your device. When listening mode is active, saying it fires SOS.
        </Text>

        {isWordSet && !editing ? (
          <View style={styles.savedWordRow}>
            <View style={styles.savedWordDisplay}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#16A34A" />
              <Text style={styles.savedWordLabel}>Safe-word set:</Text>
              <Text style={styles.savedWord}>{'•'.repeat(safeWord.length)}</Text>
            </View>
            <View style={styles.savedWordActions}>
              <TouchableOpacity style={styles.editBtn} onPress={startEdit} activeOpacity={0.8}>
                <MaterialCommunityIcons name="pencil" size={16} color="#7C3AED" />
                <Text style={styles.editBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearBtn} onPress={clearWord} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.inputArea}>
            <View style={styles.suggestRow}>
              {SUGGESTED_WORDS.map(w => (
                <TouchableOpacity key={w} style={styles.suggestChip} onPress={() => setInput(w)} activeOpacity={0.75}>
                  <Text style={styles.suggestChipText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Or type your own word..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <View style={styles.inputBtns}>
              {editing && (
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={saveWord} activeOpacity={0.85}>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Safe-Word</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Voice Listening */}
      <Text style={styles.sectionLabel}>Voice Trigger</Text>
      <View style={styles.listenCard}>
        {!isWordSet ? (
          <View style={styles.noWordRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#D97706" />
            <Text style={styles.noWordText}>Set a safe-word above before activating voice listening.</Text>
          </View>
        ) : listening ? (
          <>
            <Animated.View style={[styles.listenOrb, { transform: [{ scale: pulseAnim }] }]}>
              <MaterialCommunityIcons name="microphone" size={36} color="#fff" />
            </Animated.View>
            <Text style={styles.listeningLabel}>Listening... {countdown}s</Text>
            <Text style={styles.listeningHint}>Say "{saved}" to trigger SOS</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={() => stopListening(false)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="stop-circle" size={18} color="#DC2626" />
              <Text style={styles.stopBtnText}>Stop Listening</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.listenIdleOrb}>
              <MaterialCommunityIcons name="microphone-outline" size={36} color="#7C3AED" />
            </View>
            <Text style={styles.listenIdleLabel}>
              {detected ? 'Voice detected — SOS sent!' : `Ready to listen for "${saved}"`}
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startListening} activeOpacity={0.85}>
              <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Start Listening ({LISTEN_SECONDS}s)</Text>
            </TouchableOpacity>
            <Text style={styles.listenNote}>
              ShieldHer listens locally on your device for {LISTEN_SECONDS} seconds. No audio is recorded or sent anywhere.
            </Text>
          </>
        )}
      </View>

      {/* Tips */}
      <Text style={styles.sectionLabel}>Tips for Choosing a Safe-Word</Text>
      <View style={styles.card}>
        {TIPS.map((tip, i) => (
          <View key={i} style={[styles.tipRow, i < TIPS.length - 1 && styles.tipRowBorder]}>
            <View style={styles.tipIcon}>
              <MaterialCommunityIcons name={tip.icon as any} size={18} color="#7C3AED" />
            </View>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.privacyBox}>
        <MaterialCommunityIcons name="lock-outline" size={18} color="#1D4ED8" />
        <Text style={styles.privacyText}>
          Your safe-word and voice data are processed entirely on your device. Nothing is ever sent to any server.
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
      backgroundColor: '#3B0764',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    heroIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#DDD6FE', textAlign: 'center', lineHeight: 20 },
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

    setupCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      gap: 14,
      borderWidth: 1.5,
      borderColor: '#7C3AED',
    },
    setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    setupTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    setupBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: -4 },

    savedWordRow: { gap: 10 },
    savedWordDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#DCFCE7',
      borderRadius: 10,
      padding: 12,
    },
    savedWordLabel: { fontSize: 13, fontWeight: '600', color: '#15803D' },
    savedWord: { fontSize: 18, fontWeight: '800', color: '#15803D', letterSpacing: 3 },
    savedWordActions: { flexDirection: 'row', gap: 8 },
    editBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#EDE9FE',
      borderRadius: 10,
      padding: 10,
    },
    editBtnText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
    clearBtn: {
      width: 40,
      borderRadius: 10,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },

    inputArea: { gap: 10 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.chipBg,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    suggestChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
    input: {
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    inputBtns: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.chipBorder,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    saveBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#7C3AED',
      borderRadius: 10,
      padding: 12,
    },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    listenCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 14,
      borderWidth: 1.5,
      borderColor: '#7C3AED',
    },
    noWordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    noWordText: { flex: 1, fontSize: 13, color: '#D97706', lineHeight: 19 },

    listenOrb: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    listeningLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
    listeningHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    stopBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#DC2626',
    },
    stopBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

    listenIdleOrb: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listenIdleLabel: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#7C3AED',
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 13,
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    listenNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
    tipRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    tipIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    tipText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20, paddingTop: 2 },

    privacyBox: {
      backgroundColor: '#DBEAFE',
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    privacyText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 19 },
  });
}
