import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme, ThemeColors } from '../theme';

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
  const { childMode, setChildMode, darkMode, setDarkMode } = useAppSettings();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

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
      icon: 'bell-cog-outline',
      label: 'Notification Settings',
      iconBg: '#FEF9C3',
      iconColor: '#A16207',
      screen: 'Settings',
    },
    {
      icon: 'lock-outline',
      label: 'Privacy & Security',
      iconBg: '#DBEAFE',
      iconColor: '#1D4ED8',
      onPress: () =>
        Alert.alert(
          'Privacy & Security',
          'Your data is stored locally on your device. ShieldHer never shares your personal information.',
          [{ text: 'OK' }],
        ),
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
          'A smart safety companion for girls and women.\n\nBecause every girl and woman deserves to feel safe, anywhere, anytime.',
          [{ text: 'Close' }],
        ),
    },
  ];

  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Avatar card */}
      <View style={s.avatarCard}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.brandLogo}
          resizeMode="contain"
        />
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>

        {editing ? (
          <View style={s.editForm}>
            <TextInput
              style={s.editInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TextInput
              style={s.editInput}
              value={draftEmail}
              onChangeText={setDraftEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={s.editBtns}>
              <TouchableOpacity style={s.cancelEditBtn} onPress={() => setEditing(false)}>
                <Text style={s.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveEditBtn} onPress={saveEdit}>
                <Text style={s.saveEditText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.profileName}>{name}</Text>
            <Text style={s.profileEmail}>{email}</Text>
            <TouchableOpacity style={s.editProfileBtn} onPress={startEdit} activeOpacity={0.75}>
              <MaterialCommunityIcons name="pencil-outline" size={15} color="#7C3AED" />
              <Text style={s.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Safety status card */}
      <View style={s.statusCard}>
        <View style={s.statusRow}>
          <MaterialCommunityIcons name="shield-check" size={28} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text style={s.statusTitle}>ShieldHer Active</Text>
            <Text style={s.statusSub}>Shake detection & emergency triggers enabled</Text>
          </View>
        </View>
      </View>

      {/* Dark Mode toggle */}
      <View style={s.toggleCard}>
        <View style={s.toggleLeft}>
          <View style={s.toggleIconWrap}>
            <MaterialCommunityIcons
              name={darkMode ? 'weather-night' : 'white-balance-sunny'}
              size={22}
              color={darkMode ? '#A78BFA' : '#F59E0B'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Dark Mode</Text>
            <Text style={s.toggleSub}>Switch between light and dark theme</Text>
          </View>
        </View>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: colors.switchTrackOff, true: '#5B21B6' }}
          thumbColor={darkMode ? '#A78BFA' : colors.switchThumbOff}
        />
      </View>

      {/* Child-Friendly Mode toggle */}
      <View style={s.toggleCard}>
        <View style={s.toggleLeft}>
          <View style={[s.toggleIconWrap, { backgroundColor: '#FEF9C3' }]}>
            <Text style={s.childEmoji}>🧒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Child-Friendly Mode</Text>
            <Text style={s.toggleSub}>Bigger buttons, simpler labels, friendlier text</Text>
          </View>
        </View>
        <Switch
          value={childMode}
          onValueChange={setChildMode}
          trackColor={{ false: colors.switchTrackOff, true: '#C4B5FD' }}
          thumbColor={childMode ? '#7C3AED' : colors.switchThumbOff}
        />
      </View>

      {/* Settings menu */}
      <View style={s.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[s.menuItem, i < MENU_ITEMS.length - 1 && s.menuItemBorder]}
            activeOpacity={0.7}
            onPress={() => {
              if (item.screen) navigation.navigate(item.screen as any);
              else item.onPress?.();
            }}
          >
            <View style={[s.menuIcon, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color={item.iconColor} />
            </View>
            <Text style={s.menuLabel}>{item.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.versionText}>ShieldHer v1.0 · Because every girl and woman deserves to feel safe, anywhere, anytime.</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 16, paddingBottom: 48 },

    avatarCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 8,
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    brandLogo: {
      width: 90,
      height: 36,
      marginBottom: 4,
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
    profileName: { fontSize: 22, fontWeight: '800', color: colors.text },
    profileEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
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
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    editBtns: { flexDirection: 'row', gap: 10 },
    cancelEditBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.cardBorderLight,
      alignItems: 'center',
    },
    cancelEditText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
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

    toggleCard: {
      backgroundColor: colors.card,
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
      borderColor: colors.cardBorder,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    toggleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#1E1B2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    childEmoji: { fontSize: 22 },
    toggleTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    toggleSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 200 },

    menuCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 14,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },

    versionText: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
}
