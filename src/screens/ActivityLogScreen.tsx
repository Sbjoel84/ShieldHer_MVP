import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { readLog, clearLog, LogEntry, LogType } from '../utils/activityLog';
import { useTheme, ThemeColors } from '../theme';

type FilterType = 'all' | LogType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'sos',         label: 'SOS' },
  { key: 'checkin',     label: 'Check-In' },
  { key: 'journey',     label: 'Safe Walk' },
  { key: 'fakecall',    label: 'Fake Call' },
  { key: 'unsafe_area', label: 'Unsafe Area' },
];

const TYPE_META: Record<LogType, { icon: string; color: string; bg: string; label: string }> = {
  sos:         { icon: 'alarm-light',         color: '#DC2626', bg: '#FEE2E2', label: 'SOS Alert' },
  checkin:     { icon: 'timer-check-outline', color: '#7C3AED', bg: '#EDE9FE', label: 'Check-In' },
  journey:     { icon: 'walk',                color: '#1D4ED8', bg: '#DBEAFE', label: 'Safe Walk' },
  fakecall:    { icon: 'phone-incoming',      color: '#0F766E', bg: '#CCFBF1', label: 'Fake Call' },
  unsafe_area: { icon: 'map-marker-alert',    color: '#B45309', bg: '#FEF3C7', label: 'Unsafe Area' },
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(entries: LogEntry[]): { date: string; items: LogEntry[] }[] {
  const map = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const key = formatDate(e.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export function ActivityLogScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
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

  function confirmClear() {
    Alert.alert(
      'Clear Activity Log',
      'This will permanently delete your full activity history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearLog();
            setLog([]);
          },
        },
      ],
    );
  }

  const filtered = filter === 'all' ? log : log.filter(e => e.type === filter);
  const grouped = groupByDate(filtered);

  return (
    <View style={s.root}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterBar}
        contentContainerStyle={s.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {grouped.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="history" size={56} color="#C4B5FD" />
            <Text style={s.emptyTitle}>No Activity Yet</Text>
            <Text style={s.emptySub}>
              Your SOS alerts, check-ins, journeys, and other safety actions will appear here.
            </Text>
          </View>
        ) : (
          <>
            {grouped.map(group => (
              <View key={group.date} style={s.group}>
                <Text style={s.groupDate}>{group.date}</Text>
                <View style={s.card}>
                  {group.items.map((entry, i) => {
                    const meta = TYPE_META[entry.type];
                    return (
                      <React.Fragment key={entry.id}>
                        {i > 0 && <View style={s.divider} />}
                        <View style={s.row}>
                          <View style={[s.icon, { backgroundColor: meta.bg }]}>
                            <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                          </View>
                          <View style={s.rowBody}>
                            <View style={s.rowTop}>
                              <Text style={s.rowTitle}>{entry.title}</Text>
                              <Text style={s.rowTime}>{formatTime(entry.timestamp)}</Text>
                            </View>
                            <Text style={s.rowDetail} numberOfLines={2}>{entry.detail}</Text>
                            <View style={[s.badge, { backgroundColor: meta.bg }]}>
                              <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                          </View>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ))}

            {log.length > 0 && (
              <TouchableOpacity style={s.clearBtn} onPress={confirmClear} activeOpacity={0.7}>
                <MaterialCommunityIcons name="delete-outline" size={18} color="#DC2626" />
                <Text style={s.clearBtnText}>Clear All Activity</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    filterBar: { maxHeight: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.chipBg,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.chipText },
    chipTextActive: { color: '#fff' },

    content: { padding: 16, gap: 16, paddingBottom: 48 },

    empty: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

    group: { gap: 8 },
    groupDate: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginLeft: 4 },

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
    divider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },

    row: { flexDirection: 'row', padding: 14, gap: 12 },
    icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    rowBody: { flex: 1, gap: 4 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
    rowTime: { fontSize: 12, color: colors.textMuted },
    rowDetail: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
    badgeText: { fontSize: 11, fontWeight: '700' },

    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#FECACA',
      backgroundColor: '#FFF5F5',
    },
    clearBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  });
}
