import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const PLAN_KEY = '@shieldher_safety_plan_v1';

interface PlanItem {
  id: string;
  text: string;
  done: boolean;
}

interface PlanSection {
  id: string;
  icon: string;
  title: string;
  color: string;
  bg: string;
  items: PlanItem[];
}

const DEFAULT_PLAN: PlanSection[] = [
  {
    id: 'followed',
    icon: 'run-fast',
    title: 'If I Feel Followed',
    color: '#DC2626',
    bg: '#FEE2E2',
    items: [
      { id: '1', text: 'Walk into a busy public place (shop, restaurant, petrol station)', done: false },
      { id: '2', text: 'Call or pretend to call someone and say where I am', done: false },
      { id: '3', text: 'Activate ShieldHer shake-to-alert or press SOS', done: false },
      { id: '4', text: 'Do NOT go home directly — I could lead them there', done: false },
      { id: '5', text: 'Note their appearance: height, clothing, direction', done: false },
    ],
  },
  {
    id: 'transport',
    icon: 'car',
    title: 'Travelling Alone',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    items: [
      { id: '1', text: 'Share my route + ETA with a trusted contact before leaving', done: false },
      { id: '2', text: 'Start ShieldHer Safe Walk timer for every journey', done: false },
      { id: '3', text: 'Screenshot the driver\'s name, plate, and photo (for ride apps)', done: false },
      { id: '4', text: 'Sit in the back seat', done: false },
      { id: '5', text: 'Keep location sharing on throughout the trip', done: false },
    ],
  },
  {
    id: 'dating',
    icon: 'heart-outline',
    title: 'Meeting Someone New',
    color: '#9D174D',
    bg: '#FCE7F3',
    items: [
      { id: '1', text: 'Tell a trusted friend who I\'m meeting, where, and for how long', done: false },
      { id: '2', text: 'Always meet in a public place for first 2–3 meetings', done: false },
      { id: '3', text: 'Arrange my own transport to and from the location', done: false },
      { id: '4', text: 'Set a ShieldHer Check-In Timer before heading out', done: false },
      { id: '5', text: 'Agree a code word with my friend — if I send it, they call me', done: false },
    ],
  },
  {
    id: 'home',
    icon: 'home-lock',
    title: 'Hostel / Home Safety',
    color: '#0F766E',
    bg: '#CCFBF1',
    items: [
      { id: '1', text: 'Know who has a key to my room and never leave one under the mat', done: false },
      { id: '2', text: 'Always lock my door — even when I\'m inside', done: false },
      { id: '3', text: 'Keep my emergency contacts saved and easy to access', done: false },
      { id: '4', text: 'Trust my instincts — if something feels wrong, leave or call for help', done: false },
    ],
  },
  {
    id: 'emergency',
    icon: 'phone-alert-outline',
    title: 'Emergency Contacts Ready',
    color: '#7C3AED',
    bg: '#EDE9FE',
    items: [
      { id: '1', text: 'At least 2 trusted contacts added to ShieldHer\'s Trusted Circle', done: false },
      { id: '2', text: 'Police number saved in phone: 112', done: false },
      { id: '3', text: 'Nearest hospital number saved', done: false },
      { id: '4', text: 'NAPTIP hotline saved: 08002255840', done: false },
      { id: '5', text: 'Rape crisis / GBV helpline saved: 6232 (MTN free)', done: false },
    ],
  },
];

export function SafetyPlanScreen() {
  const [plan, setPlan] = useState<PlanSection[]>(DEFAULT_PLAN);
  const [expanded, setExpanded] = useState<string | null>('followed');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PLAN_KEY);
      if (raw) setPlan(JSON.parse(raw));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(updated: PlanSection[]) {
    setPlan(updated);
    try {
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
    } catch {}
  }

  function toggleItem(sectionId: string, itemId: string) {
    const updated = plan.map(sec =>
      sec.id !== sectionId ? sec : {
        ...sec,
        items: sec.items.map(item =>
          item.id !== itemId ? item : { ...item, done: !item.done }
        ),
      }
    );
    save(updated);
  }

  function removeItem(sectionId: string, itemId: string) {
    const updated = plan.map(sec =>
      sec.id !== sectionId ? sec : { ...sec, items: sec.items.filter(i => i.id !== itemId) }
    );
    save(updated);
  }

  function addItem(sectionId: string) {
    const text = newItemText.trim();
    if (!text) return;
    const updated = plan.map(sec =>
      sec.id !== sectionId ? sec : {
        ...sec,
        items: [...sec.items, { id: Date.now().toString(), text, done: false }],
      }
    );
    save(updated);
    setNewItemText('');
    setAddingTo(null);
  }

  function completedCount(sec: PlanSection) {
    return sec.items.filter(i => i.done).length;
  }

  const totalItems = plan.reduce((a, s) => a + s.items.length, 0);
  const totalDone = plan.reduce((a, s) => a + completedCount(s), 0);
  const pct = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100);

  function confirmReset() {
    Alert.alert(
      'Reset Safety Plan',
      'This will restore the default plan and clear your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(PLAN_KEY);
            setPlan(DEFAULT_PLAN);
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Progress summary */}
      <View style={s.progressCard}>
        <View style={s.progressTop}>
          <View>
            <Text style={s.progressTitle}>My Safety Plan</Text>
            <Text style={s.progressSub}>{totalDone} of {totalItems} steps completed</Text>
          </View>
          <View style={s.progressCircle}>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={s.progressHint}>Tap each section to expand and check off your steps.</Text>
      </View>

      {/* Sections */}
      {plan.map(section => {
        const isOpen = expanded === section.id;
        const done = completedCount(section);
        const allDone = done === section.items.length && section.items.length > 0;

        return (
          <View key={section.id} style={s.sectionCard}>
            <TouchableOpacity
              style={s.sectionHeader}
              onPress={() => setExpanded(isOpen ? null : section.id)}
              activeOpacity={0.75}
            >
              <View style={[s.sectionIcon, { backgroundColor: section.bg }]}>
                <MaterialCommunityIcons name={section.icon as any} size={22} color={section.color} />
              </View>
              <View style={s.sectionHeaderText}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={[s.sectionProgress, { color: allDone ? '#16A34A' : '#9CA3AF' }]}>
                  {allDone ? '✓ All done' : `${done}/${section.items.length} done`}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {isOpen && (
              <View style={s.sectionBody}>
                {section.items.map(item => (
                  <View key={item.id} style={s.itemRow}>
                    <TouchableOpacity
                      style={[s.checkbox, item.done && { backgroundColor: section.color, borderColor: section.color }]}
                      onPress={() => toggleItem(section.id, item.id)}
                      activeOpacity={0.75}
                    >
                      {item.done && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                    </TouchableOpacity>
                    <Text style={[s.itemText, item.done && s.itemTextDone]}>{item.text}</Text>
                    <TouchableOpacity onPress={() => removeItem(section.id, item.id)} hitSlop={8}>
                      <MaterialCommunityIcons name="close" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  </View>
                ))}

                {addingTo === section.id ? (
                  <View style={s.addForm}>
                    <TextInput
                      style={s.addInput}
                      value={newItemText}
                      onChangeText={setNewItemText}
                      placeholder="Add a step..."
                      placeholderTextColor="#9CA3AF"
                      autoFocus
                      multiline
                      onSubmitEditing={() => addItem(section.id)}
                    />
                    <View style={s.addBtns}>
                      <TouchableOpacity style={s.addCancel} onPress={() => { setAddingTo(null); setNewItemText(''); }}>
                        <Text style={s.addCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.addSave, { backgroundColor: section.color }]} onPress={() => addItem(section.id)}>
                        <Text style={s.addSaveText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.addBtn} onPress={() => setAddingTo(section.id)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="plus" size={16} color="#7C3AED" />
                    <Text style={s.addBtnText}>Add step</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={s.resetBtn} onPress={confirmReset} activeOpacity={0.7}>
        <MaterialCommunityIcons name="refresh" size={16} color="#9CA3AF" />
        <Text style={s.resetBtnText}>Reset to defaults</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F5FF' },
  content: { padding: 16, gap: 14, paddingBottom: 48 },

  progressCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  progressSub: { fontSize: 13, color: '#DDD6FE', marginTop: 2 },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: { fontSize: 18, fontWeight: '800', color: '#fff' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E91E8C', borderRadius: 4 },
  progressHint: { fontSize: 12, color: '#DDD6FE' },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sectionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1b1c1c' },
  sectionProgress: { fontSize: 12, marginTop: 2 },

  sectionBody: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 14, gap: 10 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  itemTextDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },

  addForm: { gap: 8, marginTop: 4 },
  addInput: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#1b1c1c',
    minHeight: 44,
  },
  addBtns: { flexDirection: 'row', gap: 8 },
  addCancel: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  addCancelText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  addSave: { flex: 2, padding: 10, borderRadius: 8, alignItems: 'center' },
  addSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resetBtnText: { fontSize: 13, color: '#9CA3AF' },
});
