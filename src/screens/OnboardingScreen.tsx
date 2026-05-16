import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSettings } from '../context/AppSettingsContext';

const { width } = Dimensions.get('window');

interface Slide {
  icon: string;
  iconBg: string;
  iconColor: string;
  emoji: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'shield-heart',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    emoji: '💜',
    title: 'Welcome to ShieldHer',
    body: 'A smart safety companion built just for girls and women.\n\nYour safety. Our priority.',
    accent: '#7C3AED',
  },
  {
    icon: 'alarm-light-outline',
    iconBg: '#FCE7F3',
    iconColor: '#E91E8C',
    emoji: '🆘',
    title: 'One Tap to Get Help',
    body: 'Hold the big SOS button for 3 seconds.\n\nYour location is sent to everyone you trust — instantly.',
    accent: '#E91E8C',
  },
  {
    icon: 'account-group',
    iconBg: '#DCFCE7',
    iconColor: '#16a34a',
    emoji: '👨‍👩‍👧',
    title: 'Your Trusted Circle',
    body: 'Add your mum, dad, sister, or best friend.\n\nThey\'ll always know you\'re safe — or get an alert if something\'s wrong.',
    accent: '#16a34a',
  },
  {
    icon: 'vibrate',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    emoji: '📳',
    title: 'Just Shake Your Phone',
    body: 'Can\'t open the app? Just shake your phone 3 times.\n\nShieldHer sends SOS automatically — even from your pocket.',
    accent: '#1D4ED8',
  },
  {
    icon: 'phone-incoming',
    iconBg: '#FEF9C3',
    iconColor: '#A16207',
    emoji: '📞',
    title: 'Escape Any Situation',
    body: 'Feeling uncomfortable on a date or in a crowd?\n\nTrigger a fake incoming call and walk away safely.',
    accent: '#A16207',
  },
];

export function OnboardingScreen() {
  const { markOnboardingDone } = useAppSettings();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
      markOnboardingDone();
    }
  }

  function skip() {
    markOnboardingDone();
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <SlideView key={i} slide={slide} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && {
                width: 24,
                backgroundColor: SLIDES[activeIndex].accent,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: SLIDES[activeIndex].accent }]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>
            {isLast ? "Let's Get Started 💜" : 'Next'}
          </Text>
          {!isLast && (
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          )}
        </TouchableOpacity>

        {isLast && (
          <Text style={styles.ctaNote}>
            Your data stays on your phone. We never share it.
          </Text>
        )}
      </View>
    </View>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  return (
    <View style={[styles.slide, { width }]}>
      {/* Illustration */}
      <View style={styles.illustrationArea}>
        <View style={[styles.bigCircle, { backgroundColor: slide.iconBg }]}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
        </View>
        <View style={[styles.iconBadge, { backgroundColor: slide.iconBg, borderColor: slide.iconColor + '33' }]}>
          <MaterialCommunityIcons name={slide.icon as any} size={36} color={slide.iconColor} />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textArea}>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideBody}>{slide.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F5FF',
    paddingTop: 48,
    paddingBottom: 36,
  },

  skipBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
  },
  skipText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },

  illustrationArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
  },
  bigCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 88,
    textAlign: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  textArea: { alignItems: 'center', gap: 14 },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1b1c1c',
    textAlign: 'center',
    lineHeight: 34,
  },
  slideBody: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 26,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },

  ctaContainer: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  ctaNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
