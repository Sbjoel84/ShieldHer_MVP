import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import { useContacts, RELATIONSHIPS } from '../context/ContactsContext';
import { useTheme, ThemeColors } from '../theme';

const REL_COLORS: Record<string, { bg: string; text: string }> = {
  Mom:         { bg: '#fce7f3', text: '#9d174d' },
  Dad:         { bg: '#dbeafe', text: '#1e40af' },
  Sister:      { bg: '#fef9c3', text: '#854d0e' },
  Brother:     { bg: '#dcfce7', text: '#14532d' },
  'Best Friend': { bg: '#ede9fe', text: '#5b21b6' },
  Guardian:    { bg: '#ffedd5', text: '#9a3412' },
  Partner:     { bg: '#fce7f3', text: '#9d174d' },
  Roommate:    { bg: '#f0fdf4', text: '#15803d' },
  Other:       { bg: '#f1f5f9', text: '#475569' },
};

function relColor(rel?: string) {
  return REL_COLORS[rel ?? ''] ?? { bg: '#f0eded', text: '#4a4452' };
}

export function EmergencyContactsScreen() {
  const { contacts, addContact, removeContact } = useContacts();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showForm, setShowForm] = useState(contacts.length === 0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Please enter a name and phone number.');
      return;
    }
    setSaving(true);
    await addContact(name.trim(), phone.trim(), relationship || undefined);
    setName(''); setPhone(''); setRelationship('');
    setShowForm(false);
    setSaving(false);
  }

  async function broadcastSafe() {
    if (contacts.length === 0) { Alert.alert('No contacts', 'Add contacts first.'); return; }
    setBroadcasting(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    let locMsg = '';
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      locMsg = `\nLocation: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
    }

    const phones = contacts.map(c => c.phone);
    const isAvail = await SMS.isAvailableAsync();
    if (isAvail) {
      await SMS.sendSMSAsync(phones, `✅ I'm safe! Checking in from ShieldHer.${locMsg}`);
    }
    setBroadcasting(false);
  }

  async function shareLocationWith(phone: string, name: string) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Location permission needed.'); return; }
    const loc = await Location.getCurrentPositionAsync({});
    const url = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
    const isAvail = await SMS.isAvailableAsync();
    if (isAvail) {
      await SMS.sendSMSAsync([phone], `📍 Hi ${name}, here's my current location: ${url} — ShieldHer`);
    }
  }

  function handleDelete(id: string, contactName: string) {
    Alert.alert('Remove', `Remove ${contactName} from your circle?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeContact(id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Trusted Contacts</Text>
            <Text style={styles.headerSub}>
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} in your circle
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setShowForm(f => !f)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={showForm ? 'close' : 'plus'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.broadcastBtn, broadcasting && { opacity: 0.6 }]}
          onPress={broadcastSafe}
          disabled={broadcasting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.accentText} />
          <Text style={styles.broadcastBtnText}>
            {broadcasting ? 'Sending...' : "Broadcast: I'm Safe"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-heart-outline" size={64} color="#cdc3d4" />
            <Text style={styles.emptyTitle}>Your circle is empty</Text>
            <Text style={styles.emptyBody}>
              Add the people you trust most. They'll receive your SOS alerts and can check on you.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const rc = relColor(item.relationship);
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardNameRow}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.relationship ? (
                    <View style={[styles.relBadge, { backgroundColor: rc.bg }]}>
                      <Text style={[styles.relText, { color: rc.text }]}>{item.relationship}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardPhone}>{item.phone}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                    <MaterialCommunityIcons name="phone" size={15} color={colors.accentText} />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                    const isAvail = await SMS.isAvailableAsync();
                    if (isAvail) await SMS.sendSMSAsync([item.phone], `Hi ${item.name}, checking in 💜 — ShieldHer`);
                  }}>
                    <MaterialCommunityIcons name="message-text-outline" size={15} color={colors.accentText} />
                    <Text style={styles.actionBtnText}>SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => shareLocationWith(item.phone, item.name)}>
                    <MaterialCommunityIcons name="map-marker" size={15} color="#15803d" />
                    <Text style={[styles.actionBtnText, { color: '#15803d' }]}>Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#fff1f1' }]}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          showForm ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Add to Your Circle</Text>
              <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9ca3af"
                value={name} onChangeText={setName} autoFocus />
              <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#9ca3af"
                value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Text style={styles.relLabel}>Relationship</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                  {RELATIONSHIPS.map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.relChip, relationship === r && styles.relChipActive]}
                      onPress={() => setRelationship(r === relationship ? '' : r)}
                    >
                      <Text style={[styles.relChipText, relationship === r && styles.relChipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn}
                  onPress={() => { setShowForm(false); setName(''); setPhone(''); setRelationship(''); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleAdd} disabled={saving}>
                  <Text style={styles.saveBtnText}>Add to Circle</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.accentText} />
              <Text style={styles.addBtnText}>Add Person to Circle</Text>
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { backgroundColor: '#310065', padding: 20, gap: 14 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#d7baff', marginTop: 2 },
    headerAddBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    broadcastBtn: {
      backgroundColor: '#eddcff',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    broadcastBtnText: { color: colors.accentText, fontWeight: '700', fontSize: 15 },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: '#eddcff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: { fontSize: 22, fontWeight: '800', color: colors.accentText },
    cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    cardName: { fontSize: 16, fontWeight: '700', color: colors.text },
    relBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    relText: { fontSize: 11, fontWeight: '700' },
    cardPhone: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
    cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.chipBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.accentText },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: 16, borderRadius: 14,
      borderWidth: 2, borderColor: '#310065', borderStyle: 'dashed', marginTop: 4,
    },
    addBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '600' },
    form: {
      backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 12, marginTop: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    formTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    input: {
      borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 10,
      padding: 13, fontSize: 15, color: colors.text, backgroundColor: colors.inputBg,
    },
    relLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    relChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
      borderWidth: 1.5, borderColor: colors.chipBorder, backgroundColor: colors.card,
    },
    relChipActive: { borderColor: '#310065', backgroundColor: '#eddcff' },
    relChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    relChipTextActive: { color: '#310065', fontWeight: '700' },
    formBtns: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
      borderColor: colors.chipBorder, alignItems: 'center',
    },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#310065', alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}
