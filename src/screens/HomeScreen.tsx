import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Haptics from 'expo-haptics';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useContacts } from '../context/ContactsContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTheme, ThemeColors } from '../theme';
import { FakeCallScreen } from './FakeCallScreen';
import { useShakeDetection } from '../hooks/useShakeDetection';
import type { UnsafeArea } from './UnsafeAreaScreen';
import { appendLog, readLog, LogEntry } from '../utils/activityLog';

const UNSAFE_AREAS_KEY = '@shieldher_unsafe_areas_v1';
const USER_NAME_KEY = '@shieldher_user_name_v1';
const PROXIMITY_KM = 0.5;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SosPhase = 'idle' | 'countdown' | 'active';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { contacts } = useContacts();
  const { childMode } = useAppSettings();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Sarah');

  const [sosPhase, setSosPhaseState] = useState<SosPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const sosPhaseRef = useRef<SosPhase>('idle');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPressing = useRef(false);

  const [shakeToast, setShakeToast] = useState(false);
  const shakeToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerTaps = useRef(0);
  const headerTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [nearbyArea, setNearbyArea] = useState<UnsafeArea | null>(null);
  const [recentActivity, setRecentActivity] = useState<LogEntry[]>([]);

  const checkNearbyAreas = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(UNSAFE_AREAS_KEY);
      if (!raw) return;
      const areas: UnsafeArea[] = JSON.parse(raw);
      if (areas.length === 0) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const found = areas.find(
        a => a.lat !== 0 && haversineKm(latitude, longitude, a.lat, a.lon) < PROXIMITY_KM,
      );
      if (found) setNearbyArea(found);
    } catch {}
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY)
      .then(n => { if (n) setUserName(n); })
      .catch(() => {});
    checkNearbyAreas();
    readLog().then(entries => setRecentActivity(entries.slice(0, 3))).catch(() => {});
  }, [checkNearbyAreas]);

  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      -1,
      true,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function setSosPhase(p: SosPhase) {
    sosPhaseRef.current = p;
    setSosPhaseState(p);
  }

  useShakeDetection(
    () => {
      if (sosPhaseRef.current !== 'idle') return;
      setShakeToast(true);
      if (shakeToastTimer.current) clearTimeout(shakeToastTimer.current);
      shakeToastTimer.current = setTimeout(() => setShakeToast(false), 3000);
      triggerSOS();
    },
    { count: 3, threshold: 1.8, debounceMs: 4000 },
  );

  function onHiddenTap() {
    headerTaps.current++;
    if (headerTapTimer.current) clearTimeout(headerTapTimer.current);
    if (headerTaps.current >= 5) {
      headerTaps.current = 0;
      if (sosPhaseRef.current === 'idle') onSosPressIn();
    } else {
      headerTapTimer.current = setTimeout(() => { headerTaps.current = 0; }, 2000);
    }
  }

  function onSosPressIn() {
    if (sosPhaseRef.current === 'active') return;
    isPressing.current = true;
    setSosPhase('countdown');
    setCountdown(3);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        if (isPressing.current) triggerSOS();
        else { setSosPhase('idle'); setCountdown(3); }
      }
    }, 1000);
  }

  function onSosPressOut() {
    isPressing.current = false;
    if (sosPhaseRef.current === 'countdown') {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      setSosPhase('idle');
      setCountdown(3);
    }
  }

  async function triggerSOS() {
    setSosPhase('active');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    let locUrl = 'Location unavailable';
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        locUrl = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
      }
    } catch {}
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Add contacts from the Trusted Circle tab so they can receive your SOS.',
      );
      return;
    }
    const smsAvail = await SMS.isAvailableAsync();
    if (smsAvail) {
      await SMS.sendSMSAsync(
        contacts.map(c => c.phone),
        `🚨 SOS ALERT! I need help right now!\nMy location: ${locUrl}\n\nSent from ShieldHer Safety App`,
      );
    }
    appendLog({
      type: 'sos',
      title: 'SOS Alert Triggered',
      detail: `Emergency SMS sent to ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}. Location: ${locUrl}`,
    });
    await Linking.openURL(`tel:${contacts[0].phone}`);
  }

  function cancelSOS() {
    setSosPhase('idle');
    setCountdown(3);
  }

  const isSafe = contacts.length > 0;

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="menu" size={26} color={colors.accentText} />
            </TouchableOpacity>
            <View>
              <TouchableOpacity onPress={onHiddenTap} activeOpacity={1}>
                <Text style={styles.greeting}>Hello, {userName} 🔥</Text>
              </TouchableOpacity>
              <Text style={styles.tagline}>Smart Safety. Stronger Together.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}
            onPress={() => navigation.navigate('Alerts')}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.accentText} />
          </TouchableOpacity>
        </View>

        {/* Shake toast */}
        {shakeToast && (
          <View style={styles.shakeToast}>
            <MaterialCommunityIcons name="vibrate" size={18} color="#fff" />
            <Text style={styles.shakeToastText}>Shake detected — SOS triggered!</Text>
          </View>
        )}

        {/* Nearby unsafe area banner */}
        {nearbyArea && (
          <TouchableOpacity
            style={styles.unsafeBanner}
            onPress={() => setNearbyArea(null)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="map-marker-alert" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.unsafeBannerTitle}>Unsafe area nearby</Text>
              <Text style={styles.unsafeBannerBody}>
                {nearbyArea.locationName} — {nearbyArea.type}. Tap to dismiss.
              </Text>
            </View>
            <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {/* Status badge */}
          <View style={[styles.statusBadge, !isSafe && styles.statusBadgeDanger]}>
            <MaterialCommunityIcons
              name={isSafe ? 'shield-check' : 'shield-alert'}
              size={16}
              color={isSafe ? '#16a34a' : '#dc2626'}
            />
            <Text style={[styles.statusText, !isSafe && styles.statusTextDanger]}>
              {isSafe ? 'You are protected' : 'Add emergency contacts'}
            </Text>
          </View>

          {/* Child mode banner */}
          {childMode && (
            <View style={styles.childBanner}>
              <Text style={styles.childBannerEmoji}>🧒</Text>
              <Text style={styles.childBannerText}>Child-Friendly Mode is ON</Text>
            </View>
          )}

          {/* SOS area */}
          <View style={styles.sosArea}>
            <View style={[styles.sosRingOuter, childMode && styles.sosRingOuterChild]} />
            <View style={[styles.sosRingInner, childMode && styles.sosRingInnerChild]} />
            <AnimatedPressable
              onPressIn={onSosPressIn}
              onPressOut={onSosPressOut}
              style={[
                styles.sosButton,
                childMode && styles.sosButtonChild,
                sosPhase === 'countdown' && styles.sosButtonCountdown,
                sosPhase === 'active' && styles.sosButtonActive,
                sosPhase === 'idle' && pulseStyle,
              ]}
            >
              {sosPhase === 'countdown' ? (
                <>
                  <Text style={[styles.sosCountdownNum, childMode && styles.sosCountdownNumChild]}>
                    {countdown}
                  </Text>
                  <Text style={styles.sosSub}>HOLD...</Text>
                </>
              ) : sosPhase === 'active' ? (
                <>
                  <MaterialCommunityIcons name="shield-alert" size={childMode ? 48 : 36} color="#fff" />
                  <Text style={[styles.sosActiveLabel, childMode && styles.sosActiveLabelChild]}>
                    {childMode ? 'HELP SENT! 💜' : 'SOS SENT'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.sosText, childMode && styles.sosTextChild]}>
                    {childMode ? 'HELP!' : 'SOS'}
                  </Text>
                  <Text style={styles.sosSub}>
                    {childMode ? 'hold me tight' : 'tap to alert'}
                  </Text>
                </>
              )}
            </AnimatedPressable>

            {sosPhase === 'active' ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelSOS}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.sosHint, childMode && styles.sosHintChild]}>
                {sosPhase === 'countdown'
                  ? 'Sending help…'
                  : childMode
                    ? '🤗 Hold tight • Shake your phone'
                    : 'Hold 3s · Shake phone · Tap name 5×'}
              </Text>
            )}
          </View>

          {/* Quick action grid */}
          <View style={[styles.grid, childMode && styles.gridChild]}>
            <ActionCard
              icon="account-group"
              iconBg="#EDE9FE"
              iconColor="#7C3AED"
              label={childMode ? 'My People 👨‍👩‍👧' : 'Trusted Contacts'}
              onPress={() => navigation.navigate('Emergency Contacts')}
              childMode={childMode}
              styles={styles}
            />
            <ActionCard
              icon="phone-incoming"
              iconBg="#FCE7F3"
              iconColor="#BE185D"
              label={childMode ? 'Fake Call 📞' : 'Fake Call'}
              onPress={() => setShowFakeCall(true)}
              childMode={childMode}
              styles={styles}
            />
            <ActionCard
              icon="map-marker-path"
              iconBg="#DBEAFE"
              iconColor="#1D4ED8"
              label={childMode ? 'Safe Walk 🚶' : 'Journey Tracking'}
              onPress={() => navigation.navigate('Journey Tracking')}
              childMode={childMode}
              styles={styles}
            />
            <ActionCard
              icon="lightbulb-on-outline"
              iconBg="#FEF9C3"
              iconColor="#A16207"
              label={childMode ? 'Stay Safe 💡' : 'Safety Tips'}
              onPress={() => navigation.navigate('Safety Tips')}
              childMode={childMode}
              styles={styles}
            />
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Activity Log')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {recentActivity.length === 0 ? (
                <View style={styles.activityEmpty}>
                  <MaterialCommunityIcons name="history" size={32} color="#C4B5FD" />
                  <Text style={styles.activityEmptyText}>No activity yet — stay safe out there!</Text>
                </View>
              ) : (
                recentActivity.map(entry => (
                  <ActivityItem
                    key={entry.id}
                    entry={entry}
                    styles={styles}
                  />
                ))
              )}
            </View>
          </View>

          {/* Shake active indicator */}
          <View style={styles.shakeIndicator}>
            <MaterialCommunityIcons name="vibrate" size={14} color="#7C3AED" />
            <Text style={styles.shakeIndicatorText}>Shake-to-Alert is active</Text>
          </View>
        </View>
      </ScrollView>

      {/* SOS Active overlay */}
      {sosPhase === 'active' && (
        <View style={styles.sosOverlay} pointerEvents="box-none">
          <View style={styles.sosOverlayCard}>
            {/* Shield icon */}
            <View style={styles.sosOverlayIconWrap}>
              <MaterialCommunityIcons name="shield-check" size={44} color="#fff" />
            </View>
            <Text style={styles.sosOverlayTitle}>Help is on the way!</Text>
            <Text style={styles.sosOverlayBody}>
              {contacts.length > 0
                ? `Sharing location with ${contacts.map(c => c.name).slice(0, 3).join(', ')}…`
                : 'No contacts configured. Add contacts to receive your alerts.'}
            </Text>

            {/* 4-step progress */}
            <View style={styles.sosProgressRow}>
              {[
                { label: 'SOS\nTriggered',    icon: 'alert-circle',     done: true  },
                { label: 'Alerts\nSent',       icon: 'bell-ring',        done: true  },
                { label: 'Location\nShared',   icon: 'map-marker-check', done: true  },
                { label: 'Help\nNotified',     icon: 'check-circle',     done: false },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  <View style={styles.sosProgressStep}>
                    <View style={[styles.sosProgressDot, s.done && styles.sosProgressDotDone]}>
                      <MaterialCommunityIcons
                        name={s.icon as any}
                        size={16}
                        color={s.done ? '#fff' : '#9ca3af'}
                      />
                    </View>
                    <Text style={[styles.sosProgressLabel, s.done && styles.sosProgressLabelDone]}>
                      {s.label}
                    </Text>
                  </View>
                  {i < 3 && <View style={[styles.sosProgressLine, s.done && styles.sosProgressLineDone]} />}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity style={styles.cancelBtnLarge} onPress={cancelSOS}>
              <Text style={styles.cancelBtnText}>Cancel SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fake Call modal */}
      <Modal
        visible={showFakeCall}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <FakeCallScreen onClose={() => setShowFakeCall(false)} />
      </Modal>
    </>
  );
};

function ActionCard({
  icon, iconBg, iconColor, label, onPress, childMode, styles,
}: {
  icon: string; iconBg: string; iconColor: string;
  label: string; onPress: () => void; childMode?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, childMode && styles.cardChild]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.cardIcon, childMode && styles.cardIconChild, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={childMode ? 34 : 26} color={iconColor} />
      </View>
      <Text style={[styles.cardLabel, childMode && styles.cardLabelChild]}>{label}</Text>
    </TouchableOpacity>
  );
}

const ENTRY_META: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  sos:         { icon: 'alarm-light',          iconBg: '#FEE2E2', iconColor: '#DC2626' },
  checkin:     { icon: 'timer-check-outline',  iconBg: '#EDE9FE', iconColor: '#7C3AED' },
  journey:     { icon: 'walk',                 iconBg: '#DBEAFE', iconColor: '#1D4ED8' },
  fakecall:    { icon: 'phone-incoming',       iconBg: '#CCFBF1', iconColor: '#0F766E' },
  unsafe_area: { icon: 'map-marker-alert',     iconBg: '#FEF3C7', iconColor: '#B45309' },
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityItem({ entry, styles }: { entry: LogEntry; styles: ReturnType<typeof makeStyles> }) {
  const meta = ENTRY_META[entry.type] ?? ENTRY_META.checkin;
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: meta.iconBg }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle}>{entry.title}</Text>
        <Text style={styles.activitySub} numberOfLines={1}>{entry.detail}</Text>
      </View>
      <Text style={styles.activityTime}>{timeAgo(entry.timestamp)}</Text>
    </View>
  );
}

const SOS_SIZE = 140;

function makeStyles(colors: ThemeColors, isDark = false) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 32 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    greeting: { fontSize: 20, fontWeight: '800', color: colors.accentText },
    tagline: { fontSize: 11, color: isDark ? '#A78BFA' : '#7C3AED', fontWeight: '500', marginTop: 1 },
    bellBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },

    shakeToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#dc2626',
      margin: 12,
      marginBottom: 0,
      padding: 12,
      borderRadius: 12,
    },
    shakeToastText: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
    unsafeBanner: {
      backgroundColor: '#BE185D',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingHorizontal: 16,
      gap: 10,
    },
    unsafeBannerTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
    unsafeBannerBody: { fontSize: 11, color: '#ffd6e0', marginTop: 1 },

    content: { padding: 20, gap: 24 },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'center',
    },
    statusBadgeDanger: { backgroundColor: '#FEE2E2' },
    statusText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
    statusTextDanger: { color: '#dc2626' },

    sosArea: { alignItems: 'center', paddingVertical: 10, gap: 16 },
    sosRingOuter: {
      position: 'absolute',
      width: SOS_SIZE + 64,
      height: SOS_SIZE + 64,
      borderRadius: (SOS_SIZE + 64) / 2,
      borderWidth: 1.5,
      borderColor: '#E91E8C',
      opacity: 0.15,
      top: 10 - 32,
    },
    sosRingInner: {
      position: 'absolute',
      width: SOS_SIZE + 32,
      height: SOS_SIZE + 32,
      borderRadius: (SOS_SIZE + 32) / 2,
      borderWidth: 1.5,
      borderColor: '#E91E8C',
      opacity: 0.25,
      top: 10 - 16,
    },
    sosButton: {
      width: SOS_SIZE,
      height: SOS_SIZE,
      borderRadius: SOS_SIZE / 2,
      backgroundColor: '#E91E8C',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 12,
      shadowColor: '#E91E8C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    },
    sosButtonCountdown: { backgroundColor: '#dc2626' },
    sosButtonActive: { backgroundColor: '#9B1C1C' },
    sosText: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    sosSub: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 1, marginTop: 2 },
    sosCountdownNum: { fontSize: 56, fontWeight: '900', color: '#fff' },
    sosActiveLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 4, letterSpacing: 1 },
    sosHint: { fontSize: 12, color: '#6B21A8', textAlign: 'center', maxWidth: 260 },
    cancelBtn: {
      backgroundColor: '#3B0764',
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: 20,
    },
    cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      gap: 10,
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    cardLabel: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },

    section: { gap: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    seeAll: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },
    activityList: { gap: 8 },
    activityEmpty: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    activityEmptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    activityItem: {
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    activityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    activityTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    activitySub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    activityTime: { fontSize: 12, color: colors.textMuted },

    shakeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
      backgroundColor: '#EDE9FE',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    shakeIndicatorText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },

    childBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF9C3',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    childBannerEmoji: { fontSize: 18 },
    childBannerText: { fontSize: 13, fontWeight: '700', color: '#A16207' },

    sosRingOuterChild: { width: SOS_SIZE + 90, height: SOS_SIZE + 90, borderRadius: (SOS_SIZE + 90) / 2, top: -15 },
    sosRingInnerChild: { width: SOS_SIZE + 50, height: SOS_SIZE + 50, borderRadius: (SOS_SIZE + 50) / 2, top: 5 },
    sosButtonChild: { width: SOS_SIZE + 40, height: SOS_SIZE + 40, borderRadius: (SOS_SIZE + 40) / 2 },
    sosTextChild: { fontSize: 52, letterSpacing: -1 },
    sosCountdownNumChild: { fontSize: 72 },
    sosActiveLabelChild: { fontSize: 16, marginTop: 6 },
    sosHintChild: { fontSize: 15, fontWeight: '600' },

    gridChild: { gap: 14 },
    cardChild: { width: '47%', paddingVertical: 22, gap: 12, borderRadius: 22 },
    cardIconChild: { width: 64, height: 64, borderRadius: 32 },
    cardLabelChild: { fontSize: 15, fontWeight: '800' },

    sosOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    },
    sosOverlayCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 32,
      margin: 24,
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    sosOverlayIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#16a34a',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    sosOverlayTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    sosOverlayBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260 },
    sosProgressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    sosProgressStep: { alignItems: 'center', gap: 6, width: 64 },
    sosProgressDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sosProgressDotDone: { backgroundColor: '#E91E8C' },
    sosProgressLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14 },
    sosProgressLabelDone: { color: '#E91E8C', fontWeight: '700' },
    sosProgressLine: { width: 20, height: 2, backgroundColor: colors.chipBg, marginTop: 16, flexShrink: 1 },
    sosProgressLineDone: { backgroundColor: '#E91E8C' },
    cancelBtnLarge: {
      marginTop: 8,
      backgroundColor: '#3B0764',
      paddingHorizontal: 36,
      paddingVertical: 14,
      borderRadius: 20,
    },
  });
}
