import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../theme';

interface FAQ {
  q: string;
  a: string;
}

interface FAQSection {
  id: string;
  icon: string;
  title: string;
  color: string;
  bg: string;
  faqs: FAQ[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'sos',
    icon: 'alarm-light-outline',
    title: 'SOS & Emergency Triggers',
    color: '#DC2626',
    bg: '#FEE2E2',
    faqs: [
      {
        q: 'How do I trigger SOS?',
        a: 'There are 3 ways: (1) Hold the SOS button on the home screen for 3 seconds. (2) Shake your phone 3 times quickly. (3) Tap the greeting text ("Hello, [name]") 5 times within 2 seconds. All methods silently alert your trusted contacts.',
      },
      {
        q: 'Will my contacts know I sent an SOS?',
        a: 'Yes — ShieldHer sends an SMS to everyone in your Trusted Circle with a message and your GPS location link as soon as SOS is triggered.',
      },
      {
        q: 'What if I trigger SOS by mistake?',
        a: 'Tap "Cancel SOS" on the red overlay that appears. Your contacts will still see the message, so it\'s a good idea to call them to let them know you\'re safe.',
      },
      {
        q: 'Do I need internet for SOS to work?',
        a: 'SOS uses SMS, which works without mobile data. However, the GPS location link requires an internet connection to load the map for whoever receives it.',
      },
    ],
  },
  {
    id: 'contacts',
    icon: 'account-group-outline',
    title: 'Trusted Circle',
    color: '#7C3AED',
    bg: '#EDE9FE',
    faqs: [
      {
        q: 'How do I add emergency contacts?',
        a: 'Go to My Circle tab or open the drawer and tap "Trusted Circle". Press the + button, enter the person\'s name and phone number, and save.',
      },
      {
        q: 'How many contacts can I add?',
        a: 'There is no limit. We recommend at least 2–3 trusted people who are likely to respond quickly.',
      },
      {
        q: 'Can I choose which contact gets a specific alert?',
        a: 'For SOS alerts, all contacts in your circle are notified. The Journey Tracking and Check-In Timer screens let you choose specific contacts.',
      },
    ],
  },
  {
    id: 'features',
    icon: 'shield-check-outline',
    title: 'App Features',
    color: '#0F766E',
    bg: '#CCFBF1',
    faqs: [
      {
        q: 'What is the Check-In Timer?',
        a: 'Set a countdown before going somewhere alone. If you don\'t tap "I\'m Safe" before time runs out, ShieldHer automatically sends an SOS SMS to your contacts.',
      },
      {
        q: 'What is Safe Walk?',
        a: 'Safe Walk (Journey Tracking) lets you set a destination and time limit for a trip. You can tap "I Arrived Safely" when done, or it alerts your circle if the timer expires.',
      },
      {
        q: 'What is the Fake Call feature?',
        a: 'It simulates an incoming call from a chosen contact. Useful for escaping uncomfortable situations — answer the "call" and use it as an excuse to leave.',
      },
      {
        q: 'How does Evidence Recording work?',
        a: 'It silently records audio in the background. Recordings are saved on your device and can be shared via email or other apps. This can be useful for documenting incidents.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: 'lock-outline',
    title: 'Privacy & Data',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    faqs: [
      {
        q: 'Where is my data stored?',
        a: 'All data — contacts, settings, activity logs, safety plans — is stored only on your phone. ShieldHer does not send your data to any server.',
      },
      {
        q: 'Is my location tracked all the time?',
        a: 'No. Location is only accessed when you trigger SOS, start Safe Walk, or start the Check-In Timer. It is not monitored in the background.',
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can clear your activity log in Settings. Uninstalling the app removes all locally stored data.',
      },
    ],
  },
];

const HOTLINES = [
  { label: 'Nigeria Police Emergency',     number: '112',           icon: 'police-badge-outline', color: '#1D4ED8' },
  { label: 'Nigeria Police Force',         number: '199',           icon: 'shield-outline',       color: '#1D4ED8' },
  { label: 'NAPTIP GBV Hotline',           number: '08002255840',   icon: 'phone-alert-outline',  color: '#DC2626' },
  { label: 'Mirabel Centre (Lagos)',        number: '08000426235',   icon: 'hospital-box-outline', color: '#9D174D' },
  { label: 'Victim Support Fund',          number: '0800-1111-00',  icon: 'hand-heart-outline',   color: '#0F766E' },
  { label: 'Project Alert (Lagos)',        number: '08060551616',   icon: 'account-voice',        color: '#7C3AED' },
];

function FAQItem({ faq, isLast }: { faq: FAQ; isLast: boolean }) {
  const { colors } = useTheme();
  const f = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  return (
    <View style={[f.item, !isLast && f.itemBorder]}>
      <TouchableOpacity style={f.question} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <Text style={f.questionText}>{faq.q}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {open && <Text style={f.answer}>{faq.a}</Text>}
    </View>
  );
}

function SectionCard({ section }: { section: FAQSection }) {
  const { colors } = useTheme();
  const f = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  return (
    <View style={f.sectionCard}>
      <TouchableOpacity style={f.sectionHeader} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <View style={[f.sectionIcon, { backgroundColor: section.bg }]}>
          <MaterialCommunityIcons name={section.icon as any} size={22} color={section.color} />
        </View>
        <Text style={f.sectionTitle}>{section.title}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
      </TouchableOpacity>
      {open && (
        <View style={f.faqList}>
          {section.faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} isLast={i === section.faqs.length - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

function callHotline(number: string) {
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert('Cannot place call', `Please dial ${number} manually.`)
  );
}

export function HelpCenterScreen() {
  const { colors } = useTheme();
  const f = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView style={f.root} contentContainerStyle={f.content}>
      {/* Header banner */}
      <View style={f.banner}>
        <MaterialCommunityIcons name="lifebuoy" size={36} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={f.bannerTitle}>Help Center</Text>
          <Text style={f.bannerSub}>Find answers and emergency contacts here</Text>
        </View>
      </View>

      {/* Emergency Hotlines */}
      <View style={f.section}>
        <Text style={f.sectionLabel}>Emergency Hotlines</Text>
        <View style={f.hotlineCard}>
          {HOTLINES.map((h, i) => (
            <React.Fragment key={h.label}>
              {i > 0 && <View style={f.divider} />}
              <TouchableOpacity
                style={f.hotlineRow}
                onPress={() => callHotline(h.number)}
                activeOpacity={0.75}
              >
                <View style={[f.hotlineIcon, { backgroundColor: `${h.color}15` }]}>
                  <MaterialCommunityIcons name={h.icon as any} size={20} color={h.color} />
                </View>
                <View style={f.hotlineText}>
                  <Text style={f.hotlineLabel}>{h.label}</Text>
                  <Text style={[f.hotlineNumber, { color: h.color }]}>{h.number}</Text>
                </View>
                <MaterialCommunityIcons name="phone-outline" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* FAQ */}
      <View style={f.section}>
        <Text style={f.sectionLabel}>Frequently Asked Questions</Text>
        {FAQ_SECTIONS.map(sec => <SectionCard key={sec.id} section={sec} />)}
      </View>

      {/* Contact support */}
      <View style={f.supportCard}>
        <MaterialCommunityIcons name="email-outline" size={28} color="#7C3AED" />
        <View style={{ flex: 1 }}>
          <Text style={f.supportTitle}>Still need help?</Text>
          <Text style={f.supportSub}>Reach our team at support@shieldher.app</Text>
        </View>
        <TouchableOpacity
          style={f.supportBtn}
          onPress={() => Linking.openURL('mailto:support@shieldher.app?subject=ShieldHer Support').catch(() => {})}
          activeOpacity={0.75}
        >
          <Text style={f.supportBtnText}>Email us</Text>
        </TouchableOpacity>
      </View>

      <Text style={f.version}>ShieldHer v1.0 · Your safety. Our priority.</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 20, paddingBottom: 48 },

    banner: {
      backgroundColor: '#7C3AED',
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    bannerSub: { fontSize: 13, color: '#DDD6FE', marginTop: 2 },

    section: { gap: 10 },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },

    hotlineCard: {
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
    hotlineRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    hotlineIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    hotlineText: { flex: 1 },
    hotlineLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    hotlineNumber: { fontSize: 15, fontWeight: '800', marginTop: 2 },

    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 8,
      shadowColor: '#3B0764',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    sectionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },

    faqList: { borderTopWidth: 1, borderTopColor: colors.divider },
    item: { paddingHorizontal: 16, paddingVertical: 12 },
    itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    question: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    questionText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 20 },
    answer: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 8 },

    supportCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    supportTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    supportSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    supportBtn: {
      backgroundColor: '#7C3AED',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    supportBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    version: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
  });
}
