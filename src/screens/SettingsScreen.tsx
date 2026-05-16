import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSettings } from '../context/AppSettingsContext';
import { clearLog } from '../utils/activityLog';

const SHAKE_KEY        = '@shieldher_shake_sensitivity_v1';
const SOS_VIB_KEY      = '@shieldher_sos_vibration_v1';
const SOS_MSG_KEY      = '@shieldher_sos_message_v1';
const LOC_SHARE_KEY    = '@shieldher_location_sharing_v1';

const DEFAULT_SOS_MSG = '🚨 SOS ALERT! I need help right now!\nMy location: {{location}}\n\nSent from ShieldHer Safety App';

type ShakeSensitivity = 'low' | 'medium' | 'high';

const SHAKE_OPTIONS: { key: ShakeSensitivity; label: string; desc: string }[] = [
  { key: 'low',    label: 'Low',    desc: 'Harder to trigger accidentally' },
  { key: 'medium', label: 'Medium', desc: 'Balanced — recommended' },
  { key: 'high',   label: 'High',   desc: 'Easier to trigger with a small shake' },
];

export function SettingsScreen() {
  const { childMode, setChildMode } = useAppSettings();

  const [shakeSensitivity, setShakeSensitivity] = useState<ShakeSensitivity>('medium');
  const [sosVibration, setSosVibration]         = useState(true);
  const [locationShare, setLocationShare]       = useState(true);
  const [sosMessage, setSosMessage]             = useState(DEFAULT_SOS_MSG);
  const [editingMsg, setEditingMsg]             = useState(false);
  const [draftMsg, setDraftMsg]                 = useState('');

  const load = useCallback(async () => {
    try {
      const [shake, vib, msg, loc] = await Promise.all([
        AsyncStorage.getItem(SHAKE_KEY),
        AsyncStorage.getItem(SOS_VIB_KEY),
        AsyncStorage.getItem(SOS_MSG_KEY),
        AsyncStorage.getItem(LOC_SHARE_KEY),
      ]);
      if (shake) setShakeSensitivity(shake as ShakeSensitivity);
      if (vib !== null) setSosVibration(vib === 'true');
      if (msg) setSosMessage(msg);
      if (loc !== null) setLocationShare(loc === 'true');
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function updateShake(v: ShakeSensitivity) {
    setShakeSensitivity(v);
    await AsyncStorage.setItem(SHAKE_KEY, v).catch(() => {});
  }

  async function updateVibration(v: boolean) {
    setSosVibration(v);
    await AsyncStorage.setItem(SOS_VIB_KEY, v ? 'true' : 'false').catch(() => {});
  }

  async function updateLocationShare(v: boolean) {
    setLocationShare(v);
    await AsyncStorage.setItem(LOC_SHARE_KEY, v ? 'true' : 'false').catch(() => {});
  }

  function startEditMsg() {
    setDraftMsg(sosMessage);
    setEditingMsg(true);
  }

  async function saveMsg() {
    const t = draftMsg.trim();
    if (!t) return;
    setSosMessage(t);
    setEditingMsg(false);
    await AsyncStorage.setItem(SOS_MSG_KEY, t).catch(() => {});
  }

  async function resetMsg() {
    setSosMessage(DEFAULT_SOS_MSG);
    setEditingMsg(false);
    await AsyncStorage.setItem(SOS_MSG_KEY, DEFAULT_SOS_MSG).catch(() => {});
  }

  function confirmClearLog() {
    Alert.alert(
      'Clear Activity Log',
      'This will permanently delete all activity history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => { await clearLog(); Alert.alert('Cleared', 'Activity log has been cleared.'); } },
      ],
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* Shake Sensitivity */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: '#FCE7F3' }]}>
            <MaterialCommunityIcons name="vibrate" size={20} color="#BE185D" />
          </View>
          <View style={s.cardHeaderText}>
            <Text style={s.cardTitle}>Shake Sensitivity</Text>
            <Text style={s.cardSub}>How hard you need to shake to trigger SOS</Text>
          </View>
        </View>
        <View style={s.optionRow}>
          {SHAKE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.optionBtn, shakeSensitivity === opt.key && s.optionBtnActive]}
              onPress={() => updateShake(opt.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.optionLabel, shakeSensitivity === opt.key && s.optionLabelActive]}>{opt.label}</Text>
              <Text style={[s.optionDesc, shakeSensitivity === opt.key && { color: '#DDD6FE' }]}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggles */}
      <View style={s.card}>
        {/* SOS Vibration */}
        <View style={s.toggleRow}>
          <View style={[s.cardIcon, { backgroundColor: '#EDE9FE' }]}>
            <MaterialCommunityIcons name="vibrate" size={20} color="#7C3AED" />
          </View>
          <View style={s.toggleText}>
            <Text style={s.toggleTitle}>SOS Vibration</Text>
            <Text style={s.toggleSub}>Phone vibrates when SOS is activated</Text>
          </View>
          <Switch
            value={sosVibration}
            onValueChange={updateVibration}
            trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
            thumbColor={sosVibration ? '#7C3AED' : '#fff'}
          />
        </View>

        <View style={s.divider} />

        {/* Location Sharing */}
        <View style={s.toggleRow}>
          <View style={[s.cardIcon, { backgroundColor: '#DCFCE7' }]}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#15803D" />
          </View>
          <View style={s.toggleText}>
            <Text style={s.toggleTitle}>Include Location in SOS</Text>
            <Text style={s.toggleSub}>Append a Google Maps link to your SOS message</Text>
          </View>
          <Switch
            value={locationShare}
            onValueChange={updateLocationShare}
            trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
            thumbColor={locationShare ? '#16A34A' : '#fff'}
          />
        </View>

        <View style={s.divider} />

        {/* Child-Friendly Mode */}
        <View style={s.toggleRow}>
          <View style={[s.cardIcon, { backgroundColor: '#FEF9C3' }]}>
            <Text style={{ fontSize: 18 }}>🧒</Text>
          </View>
          <View style={s.toggleText}>
            <Text style={s.toggleTitle}>Child-Friendly Mode</Text>
            <Text style={s.toggleSub}>Bigger buttons, simpler labels on the home screen</Text>
          </View>
          <Switch
            value={childMode}
            onValueChange={setChildMode}
            trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
            thumbColor={childMode ? '#7C3AED' : '#fff'}
          />
        </View>
      </View>

      {/* SOS Message */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="message-alert-outline" size={20} color="#DC2626" />
          </View>
          <View style={s.cardHeaderText}>
            <Text style={s.cardTitle}>Custom SOS Message</Text>
            <Text style={s.cardSub}>Use {`{{location}}`} to insert your coordinates automatically</Text>
          </View>
        </View>

        {editingMsg ? (
          <View style={s.msgEdit}>
            <TextInput
              style={s.msgInput}
              value={draftMsg}
              onChangeText={setDraftMsg}
              multiline
              autoFocus
              placeholder="Enter your SOS message..."
              placeholderTextColor="#9CA3AF"
            />
            <View style={s.msgBtns}>
              <TouchableOpacity style={s.msgReset} onPress={resetMsg}>
                <Text style={s.msgResetText}>Reset default</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.msgCancel} onPress={() => setEditingMsg(false)}>
                <Text style={s.msgCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.msgSave} onPress={saveMsg}>
                <Text style={s.msgSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.msgPreview}>
            <Text style={s.msgText}>{sosMessage}</Text>
            <TouchableOpacity style={s.editMsgBtn} onPress={startEditMsg} activeOpacity={0.7}>
              <MaterialCommunityIcons name="pencil-outline" size={15} color="#7C3AED" />
              <Text style={s.editMsgBtnText}>Edit Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Data */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: '#F3F4F6' }]}>
            <MaterialCommunityIcons name="database-outline" size={20} color="#374151" />
          </View>
          <View style={s.cardHeaderText}>
            <Text style={s.cardTitle}>Data & Privacy</Text>
            <Text style={s.cardSub}>All data is stored locally on your device only</Text>
          </View>
        </View>
        <TouchableOpacity style={s.dangerBtn} onPress={confirmClearLog} activeOpacity={0.7}>
          <MaterialCommunityIcons name="delete-outline" size={18} color="#DC2626" />
          <Text style={s.dangerBtnText}>Clear Activity Log</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.note}>ShieldHer v1.0 · Data stays private on your device</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F5FF' },
  content: { padding: 16, gap: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    gap: 14,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1b1c1c' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  optionRow: { gap: 8 },
  optionBtn: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9F5FF',
  },
  optionBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  optionLabelActive: { color: '#fff' },
  optionDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#F3F4F6' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#1b1c1c' },
  toggleSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  msgEdit: { gap: 10 },
  msgInput: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1b1c1c',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  msgBtns: { flexDirection: 'row', gap: 8 },
  msgReset: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  msgResetText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  msgCancel: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  msgCancelText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  msgSave: { flex: 2, padding: 10, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center' },
  msgSaveText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  msgPreview: { gap: 10 },
  msgText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F9F5FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  editMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editMsgBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },

  note: { textAlign: 'center', fontSize: 12, color: '#9CA3AF' },
});
