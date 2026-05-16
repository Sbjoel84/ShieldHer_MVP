import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAppSettings } from '../context/AppSettingsContext';

const USER_NAME_KEY = '@shieldher_user_name_v1';
const USER_EMAIL_KEY = '@shieldher_user_email_v1';

interface MenuItem {
  icon: string;
  label: string;
  iconBg: string;
  iconColor: string;
  screen?: string;
  onPress?: () => void;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { childMode, setChildMode } = useAppSettings();
  const [name, setName] = useState('Sarah Johnson');
  const [email, setEmail] = useState('sarah@email.com');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(USER_NAME_KEY),
      AsyncStorage.getItem(USER_EMAIL_KEY),
    ]).then(([n, e]) => {
      if (n) setName(n);
      if (e) setEmail(e);
    }).catch(() => {});
  }, []);

  function startEdit() {
    setDraftName(name);
    setDraftEmail(email);
    setEditing(true);
  }

  async function saveEdit() {
    const trimName = draftName.trim();
    const trimEmail = draftEmail.trim();
    if (!trimName) { Alert.alert('Name cannot be empty.'); return; }
    setName(trimName);
    setEmail(trimEmail);
    await AsyncStorage.setItem(USER_NAME_KEY, trimName);
    await AsyncStorage.setItem(USER_EMAIL_KEY, trimEmail);
    setEditing(false);
  }

  const MENU_ITEMS: MenuItem[] = [
    {
      icon: 'shield-cog-outline',
      label: 'Emergency Settings',
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      screen: 'Emergency Contacts',
    },
    {
      icon: 'bell-ring-outline',
      label: 'Trigger Methods',
      iconBg: '#FCE7F3',
      iconColor: '#BE185D',
      screen: 'Trigger Methods',
    },
    {
      icon: 'timer-outline',
      label: 'Check-In Timer',
      iconBg: '#FEF9C3',
      iconColor: '#A16207',
      screen: 'Check-In Timer',
    },
    {
      icon: 'map-marker-alert-outline',
      label: 'Unsafe Area Map',
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      screen: 'Unsafe Areas',
    },
    {
      icon: 'cog-outline',
      label: 'Settings',
      iconBg: '#F3F4F6',
      iconColor: '#374151',
      screen: 'Settings',
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      iconBg: '#FFEDD5',
      iconColor: '#C2410C',
      screen: 'Help Center',
    },
    {
      icon: 'information-outline',
      label: 'About ShieldHer',
      iconBg: '#F3F4F6',
      iconColor: '#374151',
      onPress: () =>
        Alert.alert(
          'ShieldHer v1.0',
          'A smart safety companion for girls and women.\n\nHelping women get help faster during unsafe situations.',
          [{ text: 'Close' }],
        ),
    },
    {
      icon: 'play-circle-outline',
      label: 'Replay Welcome Tour',
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      onPress: async () => {
        await AsyncStorage.removeItem('@shieldher_onboarding_done_v1');
        Alert.alert(
          'Tour Reset',
          'The welcome tour will show next time you restart the app.',
          [{ text: 'OK' }],
        );
      },
    },
  ];

  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={pf.root} contentContainerStyle={pf.content}>
      {/* Avatar card */}
      <View style={pf.avatarCard}>
        <View style={pf.avatarRing}>
          <View style={pf.avatar}>
            <Text style={pf.avatarText}>{initials}</Text>
          </View>
        </View>

        {editing ? (
          <View style={pf.editForm}>
            <TextInput
              style={pf.editInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Full name"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <TextInput
              style={pf.editInput}
              value={draftEmail}
              onChangeText={setDraftEmail}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={pf.editBtns}>
              <TouchableOpacity style={pf.cancelEditBtn} onPress={() => setEditing(false)}>
                <Text style={pf.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pf.saveEditBtn} onPress={saveEdit}>
                <Text style={pf.saveEditText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={pf.profileName}>{name}</Text>
            <Text style={pf.profileEmail}>{email}</Text>
            <TouchableOpacity style={pf.editProfileBtn} onPress={startEdit} activeOpacity={0.75}>
              <MaterialCommunityIcons name="pencil-outline" size={15} color="#7C3AED" />
              <Text style={pf.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Safety status card */}
      <View style={pf.statusCard}>
        <View style={pf.statusRow}>
          <MaterialCommunityIcons name="shield-check" size={28} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={pf.statusTitle}>ShieldHer Active</Text>
            <Text style={pf.statusSub}>Shake detection & emergency triggers enabled</Text>
          </View>
        </View>
      </View>

      {/* Child-Friendly Mode toggle */}
      <View style={pf.childModeCard}>
        <View style={pf.childModeLeft}>
          <View style={pf.childModeIconWrap}>
            <Text style={pf.childModeEmoji}>🧒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pf.childModeTitle}>Child-Friendly Mode</Text>
            <Text style={pf.childModeSub}>Bigger buttons, simpler labels, friendlier text</Text>
          </View>
        </View>
        <Switch
          value={childMode}
          onValueChange={setChildMode}
          trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
          thumbColor={childMode ? '#7C3AED' : '#fff'}
        />
      </View>

      {/* Settings menu */}
      <View style={pf.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[pf.menuItem, i < MENU_ITEMS.length - 1 && pf.menuItemBorder]}
            activeOpacity={0.7}
            onPress={() => {
              if (item.screen) navigation.navigate(item.screen as any);
              else item.onPress?.();
            }}
          >
            <View style={[pf.menuIcon, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color={item.iconColor} />
            </View>
            <Text style={pf.menuLabel}>{item.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={pf.versionText}>ShieldHer v1.0 · Your safety. Our priority.</Text>
    </ScrollView>
  );
}

const pf = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F5FF' },
  content: { padding: 16, gap: 16, paddingBottom: 48 },

  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#7C3AED' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1b1c1c' },
  profileEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 8,
  },
  editProfileBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 13 },

  editForm: { alignSelf: 'stretch', gap: 10, marginTop: 4 },
  editInput: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1b1c1c',
    backgroundColor: '#FAFAFA',
  },
  editBtns: { flexDirection: 'row', gap: 10 },
  cancelEditBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelEditText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  saveEditBtn: {
    flex: 2,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  saveEditText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  statusCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: '#166534' },
  statusSub: { fontSize: 12, color: '#15803D', marginTop: 2 },

  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1b1c1c' },

  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  childModeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  childModeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  childModeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childModeEmoji: { fontSize: 22 },
  childModeTitle: { fontSize: 15, fontWeight: '700', color: '#1b1c1c' },
  childModeSub: { fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: 200 },
});
