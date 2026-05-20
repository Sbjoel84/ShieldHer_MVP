import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../theme';

interface Tip {
  text: string;
}

interface Category {
  id: string;
  icon: string;
  title: string;
  color: string;
  bgColor: string;
  tips: Tip[];
}

const CATEGORIES: Category[] = [
  {
    id: 'transport',
    icon: 'bus',
    title: 'Public Transport Safety',
    color: '#1e40af',
    bgColor: '#dbeafe',
    tips: [
      { text: 'Always check the driver\'s photo, name, and plate before entering a ride.' },
      { text: 'Share your trip details with a contact before you move.' },
      { text: 'Sit in the back seat — never the front.' },
      { text: 'If the driver deviates from the route, speak up immediately.' },
      { text: 'Keep your phone charged and location on throughout your journey.' },
      { text: 'Use ShieldHer\'s Safe Walk timer for every journey.' },
    ],
  },
  {
    id: 'dating',
    icon: 'heart-outline',
    title: 'Dating Safety',
    color: '#9d174d',
    bgColor: '#fce7f3',
    tips: [
      { text: 'Always meet someone new in a public place for the first few dates.' },
      { text: 'Tell a friend where you\'re going, who you\'re meeting, and when you\'ll be back.' },
      { text: 'Arrange your own transport — don\'t accept rides on a first meeting.' },
      { text: 'Don\'t feel pressured to stay if you\'re uncomfortable. You can always leave.' },
      { text: 'Keep your drink in sight at all times.' },
      { text: 'Use ShieldHer\'s Fake Call feature as an easy exit if you need one.' },
    ],
  },
  {
    id: 'hostel',
    icon: 'home-lock',
    title: 'Hostel Safety',
    color: '#14532d',
    bgColor: '#dcfce7',
    tips: [
      { text: 'Lock your door even when inside, especially at night.' },
      { text: 'Know your neighbours — you don\'t have to be close, just aware.' },
      { text: 'Don\'t let strangers into your building, even if they seem friendly.' },
      { text: 'Keep a list of emergency numbers visible near your bed.' },
      { text: 'If a maintenance person visits, ask for ID and have someone with you.' },
      { text: 'Use ShieldHer\'s Check-In Timer when you return late.' },
    ],
  },
  {
    id: 'survival',
    icon: 'shield-alert-outline',
    title: 'Emergency Survival Tips',
    color: '#9a3412',
    bgColor: '#ffedd5',
    tips: [
      { text: 'Call 112 — it works even without airtime on any network.' },
      { text: 'Make noise — shout "Fire!" which draws more attention than "Help!".' },
      { text: 'Stay in well-lit, populated areas whenever possible.' },
      { text: 'Trust your instincts — if something feels wrong, act immediately.' },
      { text: 'Memorise two emergency numbers in case your phone is taken.' },
      { text: 'Use ShieldHer\'s SOS — it sends your location and alerts contacts instantly.' },
    ],
  },
  {
    id: 'online',
    icon: 'shield-lock-outline',
    title: 'Online Harassment Awareness',
    color: '#5b21b6',
    bgColor: '#ede9fe',
    tips: [
      { text: 'Never send intimate photos — they can be used against you forever.' },
      { text: 'If threatened with images, do NOT pay. Report to NAPTIP immediately.' },
      { text: 'Set all social media profiles to private.' },
      { text: 'Block and report accounts that harass you — screenshot first.' },
      { text: 'Don\'t share your home address, school, or daily routine online.' },
      { text: 'Anyone asking for your bank details over chat is likely a scammer.' },
    ],
  },
  {
    id: 'followed',
    icon: 'run-fast',
    title: "If You're Being Followed",
    color: '#9a3412',
    bgColor: '#ffedd5',
    tips: [
      { text: 'Cross the street or change direction — a follower will mirror you.' },
      { text: 'Enter a busy, well-lit shop or restaurant and stay near staff.' },
      { text: 'Call someone and speak your location aloud so the follower hears it.' },
      { text: 'Never go home — this reveals where you live.' },
      { text: 'Trust your instincts. If something feels wrong, it probably is.' },
      { text: 'Use ShieldHer\'s Fake Call to look like you\'re speaking to someone.' },
    ],
  },
  {
    id: 'school',
    icon: 'school-outline',
    title: 'School & Campus Safety',
    color: '#854d0e',
    bgColor: '#fef9c3',
    tips: [
      { text: 'Walk with friends after dark — especially between hostels and lecture halls.' },
      { text: 'Know where your school\'s security posts and health centre are.' },
      { text: 'Report uncomfortable lecturers or staff — harassment has no grade.' },
      { text: 'Avoid shortcuts through isolated areas, especially at night.' },
      { text: 'Let someone know your class schedule and when to expect you back.' },
      { text: 'Save your school\'s security number in your contacts now.' },
    ],
  },
  {
    id: 'harassment',
    icon: 'hand-back-right-off-outline',
    title: 'Reacting to Harassment',
    color: '#475569',
    bgColor: '#f1f5f9',
    tips: [
      { text: 'Speak loudly and clearly: "Stop that. Do not touch me." Attention helps.' },
      { text: 'Move towards other people — harassers avoid crowds.' },
      { text: 'You do not owe harassers politeness, a response, or an explanation.' },
      { text: 'Document incidents when safe: time, location, description, witnesses.' },
      { text: 'Report to police (112 or 199) even if you think nothing will happen — reports create patterns.' },
      { text: 'Talk to someone you trust. You should not carry this alone.' },
    ],
  },
];

interface Helpline {
  name: string;
  number: string;
  desc: string;
  color: string;
}

const HELPLINES: Helpline[] = [
  { name: 'Emergency Services', number: '112', desc: 'Police, fire, medical emergency', color: '#dc2626' },
  { name: 'Nigeria Police', number: '199', desc: 'Report crime, request assistance', color: '#1e40af' },
  { name: 'NAPTIP Hotline', number: '0800-888-0000', desc: 'Human trafficking & GBV support (toll-free)', color: '#7c3aed' },
  { name: 'NAPTIP SMS Line', number: '6222', desc: 'Send tip via SMS silently', color: '#7c3aed' },
  { name: 'Project Alert', number: '01-759-3461', desc: 'GBV counselling (Lagos)', color: '#be185d' },
  { name: 'WARDC Helpline', number: '08022881376', desc: 'Women\'s rights & legal aid', color: '#15803d' },
];

function HelplineCard({ item }: { item: Helpline }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={s.helplineCard}
      onPress={() => Linking.openURL(`tel:${item.number}`)}
      activeOpacity={0.8}
    >
      <View style={[s.helplineIcon, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name="phone" size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.helplineName}>{item.name}</Text>
        <Text style={s.helplineDesc}>{item.desc}</Text>
      </View>
      <Text style={[s.helplineNumber, { color: item.color }]}>{item.number}</Text>
    </TouchableOpacity>
  );
}

function CategoryCard({ cat }: { cat: Category }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.catCard}>
      <TouchableOpacity
        style={s.catHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={[s.catIcon, { backgroundColor: cat.bgColor }]}>
          <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
        </View>
        <Text style={s.catTitle}>{cat.title}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={s.catBody}>
          {cat.tips.map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={[s.tipBullet, { backgroundColor: cat.color }]} />
              <Text style={s.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function SafetyTipsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<'tips' | 'helplines'>('tips');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.headerTitle}>Safety Guide</Text>
        <Text style={s.headerSub}>Practical tips and emergency helplines for girls and women in Nigeria.</Text>

        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'tips' && s.tabBtnActive]}
            onPress={() => setTab('tips')}
          >
            <Text style={[s.tabBtnText, tab === 'tips' && s.tabBtnTextActive]}>Safety Tips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'helplines' && s.tabBtnActive]}
            onPress={() => setTab('helplines')}
          >
            <Text style={[s.tabBtnText, tab === 'helplines' && s.tabBtnTextActive]}>Helplines</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'tips' ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          <Text style={s.sectionNote}>
            Tap any category to expand. These tips are designed for everyday situations in Nigeria.
          </Text>
          {CATEGORIES.map(cat => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          <View style={s.emergencyBanner}>
            <MaterialCommunityIcons name="phone-alert" size={24} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={s.emergencyBannerTitle}>In immediate danger?</Text>
              <Text style={s.emergencyBannerBody}>Call 112 now. It works even without airtime.</Text>
            </View>
            <TouchableOpacity
              style={s.call112Btn}
              onPress={() => Linking.openURL('tel:112')}
            >
              <Text style={s.call112Text}>CALL 112</Text>
            </TouchableOpacity>
          </View>

          {HELPLINES.map(h => (
            <HelplineCard key={h.number} item={h} />
          ))}

          <View style={s.naptipNote}>
            <MaterialCommunityIcons name="shield-check" size={18} color="#7c3aed" />
            <Text style={s.naptipNoteText}>
              NAPTIP (National Agency for the Prohibition of Trafficking in Persons) handles gender-based violence, trafficking, and sexual assault cases. All calls are confidential.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { backgroundColor: '#3B0764', padding: 20, gap: 8 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#C4B5FD', lineHeight: 18 },

    tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3, marginTop: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabBtnActive: { backgroundColor: '#fff' },
    tabBtnText: { fontSize: 14, fontWeight: '600', color: '#C4B5FD' },
    tabBtnTextActive: { color: '#3B0764' },

    sectionNote: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, lineHeight: 18 },

    catCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    catHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    catBody: { padding: 16, paddingTop: 4, gap: 10, borderTopWidth: 1, borderTopColor: colors.divider },
    tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    tipBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
    tipText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },

    helplineCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    helplineIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    helplineName: { fontSize: 14, fontWeight: '700', color: colors.text },
    helplineDesc: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    helplineNumber: { fontSize: 15, fontWeight: '800' },

    emergencyBanner: {
      backgroundColor: '#fff5f5',
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderColor: '#fca5a5',
    },
    emergencyBannerTitle: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
    emergencyBannerBody: { fontSize: 13, color: '#7f1d1d', marginTop: 2 },
    call112Btn: { backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    call112Text: { color: '#fff', fontWeight: '800', fontSize: 13 },

    naptipNote: {
      backgroundColor: '#ede9fe',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      marginTop: 4,
    },
    naptipNoteText: { flex: 1, fontSize: 13, color: '#4c1d95', lineHeight: 19 },
  });
}
