import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeColors } from '../theme';

const STORAGE_KEY = '@shieldher_unsafe_areas_v1';
const PROXIMITY_KM = 0.5; // warn if within 500m

type AreaType = 'Harassment' | 'Poor Lighting' | 'Robbery' | 'Assault' | 'Unsafe Road' | 'Other';

const AREA_TYPES: AreaType[] = ['Harassment', 'Poor Lighting', 'Robbery', 'Assault', 'Unsafe Road', 'Other'];

const TYPE_COLORS: Record<AreaType, { bg: string; text: string; icon: string }> = {
  Harassment:     { bg: '#fce7f3', text: '#9d174d', icon: 'hand-back-right-off-outline' },
  'Poor Lighting':{ bg: '#fef9c3', text: '#854d0e', icon: 'lightbulb-off-outline' },
  Robbery:        { bg: '#ffedd5', text: '#9a3412', icon: 'bag-personal-off-outline' },
  Assault:        { bg: '#fee2e2', text: '#991b1b', icon: 'alert-octagon-outline' },
  'Unsafe Road':  { bg: '#dbeafe', text: '#1e40af', icon: 'road-variant' },
  Other:          { bg: '#f1f5f9', text: '#475569', icon: 'map-marker-alert-outline' },
};

export interface UnsafeArea {
  id: string;
  description: string;
  type: AreaType;
  lat: number;
  lon: number;
  locationName: string;
  reportedAt: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function UnsafeAreaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [areas, setAreas] = useState<UnsafeArea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedType, setSelectedType] = useState<AreaType>('Harassment');
  const [saving, setSaving] = useState(false);
  const [nearbyWarning, setNearbyWarning] = useState<UnsafeArea | null>(null);
  const [tab, setTab] = useState<'map' | 'list'>('list');

  const loadAreas = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setAreas(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const nearby = areas.find(a => haversineKm(latitude, longitude, a.lat, a.lon) < PROXIMITY_KM);
      if (nearby) {
        setNearbyWarning(nearby);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    })();
  }, [areas]);

  async function saveAreas(next: UnsafeArea[]) {
    setAreas(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function handleReport() {
    if (!description.trim() || !locationName.trim()) {
      Alert.alert('Missing info', 'Please add a location name and description.');
      return;
    }
    setSaving(true);

    let lat = 0;
    let lon = 0;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch {}

    const newArea: UnsafeArea = {
      id: Date.now().toString(),
      description: description.trim(),
      type: selectedType,
      lat,
      lon,
      locationName: locationName.trim(),
      reportedAt: Date.now(),
    };

    await saveAreas([newArea, ...areas]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDescription('');
    setLocationName('');
    setSelectedType('Harassment');
    setShowForm(false);
    setSaving(false);
  }

  function handleDelete(id: string) {
    Alert.alert('Remove Report', 'Remove this unsafe area report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await saveAreas(areas.filter(a => a.id !== id));
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Unsafe Area Map</Text>
            <Text style={styles.headerSub}>
              {areas.length} location{areas.length !== 1 ? 's' : ''} reported in your community
            </Text>
          </View>
          <MaterialCommunityIcons name="map-marker-alert" size={36} color="rgba(255,255,255,0.3)" />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
            onPress={() => setTab('list')}
          >
            <Text style={[styles.tabBtnText, tab === 'list' && styles.tabBtnTextActive]}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'map' && styles.tabBtnActive]}
            onPress={() => setTab('map')}
          >
            <Text style={[styles.tabBtnText, tab === 'map' && styles.tabBtnTextActive]}>How It Works</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nearby warning banner */}
      {nearbyWarning && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => setNearbyWarning(null)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="alert" size={20} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>⚠️ Unsafe area nearby!</Text>
            <Text style={styles.warningBody}>{nearbyWarning.locationName} — {nearbyWarning.type}. Tap to dismiss.</Text>
          </View>
        </TouchableOpacity>
      )}

      {tab === 'map' ? (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          <View style={styles.howCard}>
            <MaterialCommunityIcons name="map-marker-alert" size={40} color={colors.accentText} />
            <Text style={styles.howTitle}>Community-Powered Safety</Text>
            <Text style={styles.howBody}>
              ShieldHer lets you and other women mark locations where you've felt unsafe. When you're within 500m of a reported area, you'll get an automatic warning.
            </Text>
          </View>

          {[
            { icon: 'map-marker-plus', title: 'Report an Area', body: 'Tap "Report Unsafe Area" to mark your current GPS location and describe what happened or why it feels unsafe.' },
            { icon: 'radar', title: 'Proximity Alerts', body: 'ShieldHer checks your location against reports and warns you automatically when you enter a flagged area.' },
            { icon: 'shield-account', title: 'Stay Private', body: 'Reports are stored only on your device for now. No personal data is ever shared.' },
            { icon: 'lightbulb-on-outline', title: 'Examples to Report', body: 'Poor street lighting, areas where you\'ve been harassed, roads known for robbery, unsafe shortcuts, markets with known predators.' },
          ].map((item, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={areas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={64} color="#cdc3d4" />
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyBody}>
                Be the first to mark an unsafe area. Your report helps other women in your community stay safer.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = TYPE_COLORS[item.type] ?? TYPE_COLORS.Other;
            return (
              <View style={styles.reportCard}>
                <View style={[styles.reportTypeIcon, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.reportTopRow}>
                    <Text style={styles.reportLocation}>{item.locationName}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: meta.text }]}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportDesc}>{item.description}</Text>
                  <View style={styles.reportMeta}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color="#9ca3af" />
                    <Text style={styles.reportMetaText}>{timeAgo(item.reportedAt)}</Text>
                    {item.lat !== 0 && (
                      <>
                        <MaterialCommunityIcons name="map-marker" size={12} color="#9ca3af" />
                        <Text style={styles.reportMetaText}>GPS tagged</Text>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            showForm ? (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Report an Unsafe Area</Text>
                <Text style={styles.formSubtitle}>Your current GPS location will be saved with this report.</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Location name (e.g. Ojota Bus Stop)"
                  placeholderTextColor="#9ca3af"
                  value={locationName}
                  onChangeText={setLocationName}
                  autoFocus
                />
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="What happened or why does it feel unsafe?"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                <Text style={styles.typeLabel}>Type of Risk</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                    {AREA_TYPES.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
                        onPress={() => setSelectedType(t)}
                      >
                        <MaterialCommunityIcons
                          name={TYPE_COLORS[t].icon as any}
                          size={14}
                          color={selectedType === t ? '#3B0764' : '#7c7483'}
                        />
                        <Text style={[styles.typeChipText, selectedType === t && styles.typeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.formBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setDescription(''); setLocationName(''); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.6 }]} onPress={handleReport} disabled={saving}>
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                <MaterialCommunityIcons name="map-marker-plus-outline" size={22} color={colors.accentText} />
                <Text style={styles.addBtnText}>Report Unsafe Area</Text>
              </TouchableOpacity>
            )
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { backgroundColor: '#3B0764', padding: 20, gap: 12 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#d7baff', marginTop: 2 },

    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: '#fff' },
    tabBtnText: { fontSize: 13, fontWeight: '600', color: '#d7baff' },
    tabBtnTextActive: { color: '#3B0764' },

    warningBanner: {
      backgroundColor: '#b80049',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 10,
    },
    warningTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
    warningBody: { fontSize: 12, color: '#ffd6d6', marginTop: 1 },

    empty: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },

    reportCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    reportTypeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    reportTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    reportLocation: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    typeBadgeText: { fontSize: 11, fontWeight: '700' },
    reportDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 6 },
    reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reportMetaText: { fontSize: 11, color: '#9ca3af', marginRight: 8 },
    deleteBtn: { padding: 4 },

    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: '#3B0764',
      borderStyle: 'dashed',
      marginTop: 4,
    },
    addBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '600' },

    form: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    formTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    formSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: -6 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 13,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.inputBg,
    },
    typeLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.chipBorder,
      backgroundColor: colors.card,
    },
    typeChipActive: { borderColor: '#3B0764', backgroundColor: '#EDE9FE' },
    typeChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    typeChipTextActive: { color: '#3B0764', fontWeight: '700' },
    formBtns: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.chipBorder, alignItems: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    submitBtn: { flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#3B0764', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    howCard: { backgroundColor: '#EDE9FE', borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 },
    howTitle: { fontSize: 18, fontWeight: '800', color: colors.accentText, textAlign: 'center' },
    howBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
    stepCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    stepIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
    stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    stepBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  });
}
