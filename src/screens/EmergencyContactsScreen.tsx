import React, { useState } from 'react';
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
    <View style={{ flex: 1, backgroundColor: '#fcf9f8' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Trusted Circle</Text>
            <Text style={styles.headerSub}>
              {contacts.length} person{contacts.length !== 1 ? 's' : ''} watching over you
            </Text>
          </View>
          <MaterialCommunityIcons name="account-group" size={36} color="rgba(255,255,255,0.3)" />
        </View>

        <TouchableOpacity
          style={[styles.broadcastBtn, broadcasting && { opacity: 0.6 }]}
          onPress={broadcastSafe}
          disabled={broadcasting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#310065" />
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
                    <MaterialCommunityIcons name="phone" size={15} color="#310065" />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={async () => {
                    const isAvail = await SMS.isAvailableAsync();
                    if (isAvail) await SMS.sendSMSAsync([item.phone], `Hi ${item.name}, checking in 💜 — ShieldHer`);
                  }}>
                    <MaterialCommunityIcons name="message-text-outline" size={15} color="#310065" />
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
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#310065" />
              <Text style={styles.addBtnText}>Add Person to Circle</Text>
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#310065', padding: 20, gap: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#d7baff', marginTop: 2 },
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
  broadcastBtnText: { color: '#310065', fontWeight: '700', fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1b1c1c' },
  emptyBody: { fontSize: 14, color: '#4a4452', textAlign: 'center', lineHeight: 21 },
  card: {
    backgroundColor: '#fff',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eddcff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '800', color: '#310065' },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1b1c1c' },
  relBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  relText: { fontSize: 11, fontWeight: '700' },
  cardPhone: { fontSize: 13, color: '#4a4452', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0eded',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#310065' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#310065', borderStyle: 'dashed', marginTop: 4,
  },
  addBtnText: { color: '#310065', fontSize: 15, fontWeight: '600' },
  form: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1b1c1c' },
  input: {
    borderWidth: 1.5, borderColor: '#cdc3d4', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#1b1c1c', backgroundColor: '#fcf9f8',
  },
  relLabel: { fontSize: 12, fontWeight: '700', color: '#4a4452', textTransform: 'uppercase', letterSpacing: 0.5 },
  relChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#cdc3d4', backgroundColor: '#fff',
  },
  relChipActive: { borderColor: '#310065', backgroundColor: '#eddcff' },
  relChipText: { fontSize: 13, color: '#4a4452', fontWeight: '500' },
  relChipTextActive: { color: '#310065', fontWeight: '700' },
  formBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#cdc3d4', alignItems: 'center',
  },
  cancelBtnText: { color: '#4a4452', fontWeight: '600', fontSize: 14 },
  saveBtn: { flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#310065', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
