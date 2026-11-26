import React, { ComponentRef, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Button } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';
import {
  Zap,
  ShieldCheck,
  Printer,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  IndianRupee,
  Receipt,
} from '../../components/common/Icons';
import { QuickBillLogo } from '../../components/common/QuickBillLogo';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  tag: string;
  title: string;
  desc: string;
  highlights: string[];
  accentColor: string;
  softBg: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  SecondaryIcon: React.ComponentType<{ size?: number; color?: string }>;
  statText: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'pos',
    tag: 'FAST BILLING',
    title: 'Lightning-Fast 3-Tap POS',
    desc: 'Create accurate retail bills in seconds with instant product search, quick quantities, and automatic GST.',
    highlights: ['GST Auto-Split', 'Custom Walk-in Items'],
    accentColor: COLORS.primary,
    softBg: COLORS.primaryContainer,
    Icon: Zap,
    SecondaryIcon: Receipt,
    statText: '3-Tap Checkout',
  },
  {
    id: 'cloud',
    tag: 'CLOUD POWERED',
    title: 'Real-Time Supabase Sync',
    desc: 'Every invoice, stock update, and customer record saves securely to your encrypted cloud database.',
    highlights: ['Row-Level Security', 'Multi-Device Ready'],
    accentColor: COLORS.secondary,
    softBg: COLORS.secondaryContainer,
    Icon: ShieldCheck,
    SecondaryIcon: CheckCircle2,
    statText: 'Cloud Database',
  },
  {
    id: 'print',
    tag: 'RECEIPTS & PDF',
    title: 'Thermal Print & WhatsApp PDF',
    desc: 'Print wireless 58mm / 80mm thermal receipts or share clean A4 & thermal PDF invoices on WhatsApp in one tap.',
    highlights: ['58mm & 80mm Thermal', '1-Tap PDF Share'],
    accentColor: COLORS.accent,
    softBg: COLORS.accentLight,
    Icon: Printer,
    SecondaryIcon: Receipt,
    statText: 'Instant Receipts',
  },
  {
    id: 'udhar',
    tag: 'CUSTOMER LEDGER',
    title: 'Smart Udhar & Credit Tracking',
    desc: 'Accept Cash, UPI, Card, Split, or Udhar payments and track every customer balance effortlessly.',
    highlights: ['Udhar Settlement', 'Daily Sales Reports'],
    accentColor: COLORS.success,
    softBg: COLORS.successLight,
    Icon: BookOpen,
    SecondaryIcon: IndianRupee,
    statText: 'Zero Missed Dues',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = TRANSLATIONS[language];
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (pageIndex >= 0 && pageIndex < SLIDES.length) {
      setActiveSlide(pageIndex);
    }
  };

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const isLastSlide = activeSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Top Brand Header */}
      <View style={styles.topBar}>
        <QuickBillLogo size={36} showWordmark wordmarkSize={22} />

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/(auth)/login' as any)}
          style={styles.skipPill}
        >
          <Text style={styles.skipPillText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slidePage}>
            {/* Visual Showcase Panel */}
            <View style={[styles.heroShowcase, { backgroundColor: slide.softBg }]}>
              {/* Decorative Soft Circles */}
              <View
                style={[
                  styles.decorCircleLarge,
                  { borderColor: slide.accentColor, opacity: 0.14 },
                ]}
              />
              <View
                style={[
                  styles.decorCircleSmall,
                  { backgroundColor: slide.accentColor, opacity: 0.1 },
                ]}
              />

              {/* Top Eyebrow Tag inside Showcase */}
              <View style={styles.showcaseTopRow}>
                <View style={[styles.tagPill, { backgroundColor: COLORS.white }]}>
                  <Text style={[styles.tagPillText, { color: slide.accentColor }]}>
                    {slide.tag}
                  </Text>
                </View>

                <View style={styles.miniBrandPill}>
                  <QuickBillLogo size={20} />
                </View>
              </View>

              {/* Central Feature Badge */}
              <View
                style={[
                  styles.centralIconCard,
                  { shadowColor: slide.accentColor },
                ]}
              >
                <View
                  style={[
                    styles.centralIconCircle,
                    { backgroundColor: slide.accentColor },
                  ]}
                >
                  <slide.Icon size={40} color={COLORS.white} />
                </View>
              </View>

              {/* Floating Stat Pill */}
              <View style={styles.floatingStatPill}>
                <slide.SecondaryIcon size={14} color={slide.accentColor} />
                <Text style={styles.floatingStatText}>{slide.statText}</Text>
              </View>
            </View>

            {/* Copy & Highlights */}
            <View style={styles.textBlock}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDesc}>{slide.desc}</Text>

              <View style={styles.highlightsRow}>
                {slide.highlights.map((item) => (
                  <View key={item} style={styles.highlightChip}>
                    <CheckCircle2 size={14} color={slide.accentColor} />
                    <Text style={styles.highlightChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation & Auth CTAs */}
      <View style={styles.bottomDock}>
        {/* Step Progress Indicators */}
        <View style={styles.progressRow}>
          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => {
              const active = idx === activeSlide;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => goToSlide(idx)}
                  style={[
                    styles.dot,
                    active && [styles.activeDot, { backgroundColor: s.accentColor }],
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.stepCounter}>
            {activeSlide + 1} / {SLIDES.length}
          </Text>
        </View>

        {!isLastSlide ? (
          <View style={styles.actionRow}>
            <Button
              variant="bordered"
              color="default"
              size="lg"
              radius="md"
              style={styles.secondaryCta}
              onPress={() => router.push('/(auth)/login' as any)}
            >
              {t.login}
            </Button>

            <Button
              color="primary"
              size="lg"
              radius="md"
              style={styles.primaryCta}
              endContent={<ArrowRight size={18} color={COLORS.white} />}
              onPress={() => goToSlide(activeSlide + 1)}
            >
              {t.continue}
            </Button>
          </View>
        ) : (
          <View style={styles.finalActionStack}>
            <Button
              color="primary"
              size="lg"
              radius="md"
              fullWidth
              endContent={<ArrowRight size={18} color={COLORS.white} />}
              onPress={() => router.push('/(auth)/register' as any)}
            >
              Get Started — {t.register}
            </Button>

            <Button
              variant="bordered"
              color="secondary"
              size="md"
              radius="md"
              fullWidth
              onPress={() => router.push('/(auth)/login' as any)}
            >
              {t.alreadyHaveAccount} {t.login}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  carousel: {
    flex: 1,
  },
  slidePage: {
    width,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  heroShowcase: {
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    height: 280,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 22,
    top: 24,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -30,
    right: -20,
  },
  showcaseTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: ROUNDNESS.full,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  miniBrandPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralIconCard: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  centralIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: ROUNDNESS.full,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floatingStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  textBlock: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  slideTitle: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 23,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  slideDesc: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: ROUNDNESS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  highlightChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bottomDock: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: ROUNDNESS.xl,
    borderTopRightRadius: ROUNDNESS.xl,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderStrong,
  },
  activeDot: {
    width: 26,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryCta: {
    flex: 1,
  },
  primaryCta: {
    flex: 1.6,
  },
  finalActionStack: {
    gap: SPACING.sm,
  },
});
