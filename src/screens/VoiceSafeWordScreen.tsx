import React, { useState, useCallback, useMemo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeColors } from '../theme';

const SAFE_WORD_KEY = '@shieldher_safe_word_v1';

const SUGGESTED_WORDS = ['Pineapple', 'Code Red', 'Sunflower', 'Umbrella', 'Jupiter'];

const TIPS = [
  { icon: 'incognito', text: 'Choose a word you would never say in normal conversation.' },
  { icon: 'ear-hearing', text: 'Make it easy to say clearly even when panicked or whispering.' },
  { icon: 'lock-outline', text: 'Keep it private — only you should know it.' },
  { icon: 'shield-star-outline', text: 'Avoid names of people, places, or common objects you discuss daily.' },
];

const HOW_IT_WORKS = [
  { step: '1', text: 'You set a secret safe-word on this screen.' },
  { step: '2', text: 'When Voice Trigger launches, ShieldHer listens in the background (only when enabled).' },
  { step: '3', text: 'Saying your word triggers a silent SOS — no screen tap needed.' },
  { step: '4', text: 'Your location and alert are sent to your Trusted Circle instantly.' },
];

export function VoiceSafeWordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [safeWord, setSafeWord] = useState('');
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const load = useCallback(async () => {
    try {
      const w = await AsyncStorage.getItem(SAFE_WORD_KEY);
      if (w) { setSafeWord(w); setSaved(w); }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  function startEdit() {
    setInput(safeWord);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setInput('');
  }

  function clearWord() {
    Alert.alert(
      'Clear Safe-Word',
      'Remove your saved safe-word?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(SAFE_WORD_KEY);
            setSafeWord('');
            setSaved('');
          },
        },
      ],
    );
  }

  const isWordSet = saved.length > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <MaterialCommunityIcons name="microphone-outline" size={40} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Voice Safe-Word</Text>
        <Text style={styles.heroSub}>
          Say your secret word to silently trigger SOS — even when you can't touch your phone.
        </Text>
        <View style={styles.comingSoonBadge}>
          <MaterialCommunityIcons name="clock-outline" size={14} color="#DC2626" />
          <Text style={styles.comingSoonText}>Feature coming in v1.1</Text>
        </View>
      </View>

      {/* Safe Word Setup — functional now */}
      <View style={styles.setupCard}>
        <View style={styles.setupHeader}>
          <MaterialCommunityIcons name="key-variant" size={20} color="#7C3AED" />
          <Text style={styles.setupTitle}>Set Your Safe-Word Now</Text>
        </View>
        <Text style={styles.setupBody}>
          Your word is stored privately on your device and will activate automatically when Voice Trigger launches.
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
                <TouchableOpacity
                  key={w}
                  style={styles.suggestChip}
                  onPress={() => setInput(w)}
                  activeOpacity={0.75}
                >
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

      {/* Status */}
      <View style={[styles.statusCard, isWordSet ? styles.statusCardReady : styles.statusCardPending]}>
        <MaterialCommunityIcons
          name={isWordSet ? 'shield-check' : 'shield-alert-outline'}
          size={22}
          color={isWordSet ? '#16A34A' : '#D97706'}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, { color: isWordSet ? '#16A34A' : '#D97706' }]}>
            {isWordSet ? 'Ready for launch' : 'No safe-word set yet'}
          </Text>
          <Text style={styles.statusBody}>
            {isWordSet
              ? 'Your word is saved. It will activate automatically when Voice Trigger goes live in v1.1.'
              : 'Set your safe-word now so it\'s ready the moment Voice Trigger launches.'}
          </Text>
        </View>
      </View>

      {/* How it works */}
      <Text style={styles.sectionLabel}>How Voice Trigger Will Work</Text>
      <View style={styles.card}>
        {HOW_IT_WORKS.map((item, i) => (
          <View key={i} style={[styles.stepRow, i < HOW_IT_WORKS.length - 1 && styles.stepRowBorder]}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{item.step}</Text>
            </View>
            <Text style={styles.stepText}>{item.text}</Text>
          </View>
        ))}
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

      {/* Privacy note */}
      <View style={styles.privacyBox}>
        <MaterialCommunityIcons name="lock-outline" size={18} color="#1D4ED8" />
        <Text style={styles.privacyText}>
          Your safe-word is stored only on your device. It is never sent to any server and is not visible to anyone else.
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

    statusCard: {
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      borderWidth: 1,
    },
    statusCardReady: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
    statusCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    statusTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    statusBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
    stepRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepNumText: { fontSize: 13, fontWeight: '800', color: '#7C3AED' },
    stepText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20, paddingTop: 4 },

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
