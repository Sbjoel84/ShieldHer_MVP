import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { readLog, LogEntry, LogType } from '../utils/activityLog';
import { useTheme, ThemeColors } from '../theme';

const TYPE_META: Record<LogType, { icon: string; color: string; bg: string }> = {
  sos:         { icon: 'alarm-light',          color: '#DC2626', bg: '#FEE2E2' },
  checkin:     { icon: 'timer-check-outline',  color: '#7C3AED', bg: '#EDE9FE' },
  journey:     { icon: 'walk',                 color: '#1D4ED8', bg: '#DBEAFE' },
  fakecall:    { icon: 'phone-incoming',       color: '#0F766E', bg: '#CCFBF1' },
  unsafe_area: { icon: 'map-marker-alert',     color: '#B45309', bg: '#FEF3C7' },
};

const REMINDERS = [
  {
    icon: 'account-group-outline',
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Trusted Circle',
    body: 'Make sure your emergency contacts are up to date so they receive your SOS alerts.',
  },
  {
    icon: 'shake',
    color: '#E91E8C',
    bg: '#FCE7F3',
    title: 'Shake-to-Alert',
    body: 'Shake your phone 3 times to silently trigger an SOS without touching the screen.',
  },
  {
    icon: 'timer-outline',
    color: '#D97706',
    bg: '#FEF3C7',
    title: 'Check-In Timer',
    body: 'Set a timer before heading out alone. ShieldHer will alert your circle if you don\'t check in.',
  },
];

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AlertItem({ entry, s }: { entry: LogEntry; s: ReturnType<typeof makeStyles> }) {
  const meta = TYPE_META[entry.type];
  return (
    <View style={s.alertItem}>
      <View style={[s.alertIcon, { backgroundColor: meta.bg }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
      </View>
      <View style={s.alertBody}>
        <Text style={s.alertTitle}>{entry.title}</Text>
        <Text style={s.alertDetail} numberOfLines={2}>{entry.detail}</Text>
      </View>
      <Text style={s.alertTime}>{timeAgo(entry.timestamp)}</Text>
    </View>
  );
}

export function AlertsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const entries = await readLog();
    setLog(entries);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const sosAlerts = log.filter(e => e.type === 'sos' || e.type === 'unsafe_area');
  const recentActivity = log.filter(e => e.type !== 'sos' && e.type !== 'unsafe_area');

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Alerts</Text>
        <Text style={s.headerSub}>Your safety notifications</Text>
      </View>

      {/* SOS / Danger Alerts */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons name="alarm-light-outline" size={18} color="#DC2626" />
          <Text style={[s.sectionTitle, { color: '#DC2626' }]}>SOS & Danger Alerts</Text>
        </View>

        {sosAlerts.length === 0 ? (
          <View style={s.emptyCard}>
            <MaterialCommunityIcons name="shield-check-outline" size={40} color="#C4B5FD" />
            <Text style={s.emptyTitle}>All Clear</Text>
            <Text style={s.emptySub}>No SOS or danger alerts. Stay safe out there.</Text>
          </View>
        ) : (
          <View style={s.card}>
            {sosAlerts.map((e, i) => (
              <React.Fragment key={e.id}>
                {i > 0 && <View style={s.divider} />}
                <AlertItem entry={e} s={s} />
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="history" size={18} color="#7C3AED" />
            <Text style={s.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={s.card}>
            {recentActivity.slice(0, 5).map((e, i) => (
              <React.Fragment key={e.id}>
                {i > 0 && <View style={s.divider} />}
                <AlertItem entry={e} s={s} />
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Safety Reminders */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#7C3AED" />
          <Text style={s.sectionTitle}>Safety Reminders</Text>
        </View>
        {REMINDERS.map(r => (
          <View key={r.title} style={s.reminderCard}>
            <View style={[s.reminderIcon, { backgroundColor: r.bg }]}>
              <MaterialCommunityIcons name={r.icon as any} size={22} color={r.color} />
            </View>
            <View style={s.reminderBody}>
              <Text style={s.reminderTitle}>{r.title}</Text>
              <Text style={s.reminderText}>{r.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 20, paddingBottom: 48 },

    header: { paddingTop: 8, gap: 2 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 14, color: colors.textSecondary },

    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },

    card: {
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
    divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },

    alertItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    alertIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    alertBody: { flex: 1, gap: 2 },
    alertTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    alertDetail: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
    alertTime: { fontSize: 11, color: colors.textMuted, minWidth: 48, textAlign: 'right' },

    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      gap: 8,
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

    reminderCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    reminderIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    reminderBody: { flex: 1, gap: 4 },
    reminderTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    reminderText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  });
}
