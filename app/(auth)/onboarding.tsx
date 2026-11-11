import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';
import { Zap, WifiOff, Printer, BookOpen } from '../../components/common/Icons';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    Icon: Zap,
    title: 'Lightning Fast Billing',
    desc: 'Generate retail bills in 3 quick taps. Easy barcode and quick product lookup.',
  },
  {
    Icon: WifiOff,
    title: '100% Offline-First',
    desc: 'Never stop billing even with zero internet. Bills automatically sync to the cloud later.',
  },
  {
    Icon: Printer,
    title: 'Thermal & WhatsApp PDF',
    desc: 'Instant Bluetooth thermal receipt printing and one-tap WhatsApp PDF sharing.',
  },
  {
    Icon: BookOpen,
    title: 'Udhar & Customer Ledger',
    desc: 'Track customer credit, pending payments, and send automatic payment reminders.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const t = TRANSLATIONS[language];
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Text style={styles.brandTitle}>QuickBill</Text>
      </View>

      {/* Main Slide Card */}
      <View style={styles.slideContainer}>
        <Surface style={styles.slideCard} elevation={2}>
          <View style={styles.slideIconWrapper}>
            <slide.Icon size={44} color={COLORS.secondary} />
          </View>
          <Text variant="headlineSmall" style={styles.slideTitle}>
            {slide.title}
          </Text>
          <Text variant="bodyMedium" style={styles.slideDesc}>
            {slide.desc}
          </Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setActiveSlide(i)}
                style={[styles.dot, activeSlide === i && styles.activeDot]}
              />
            ))}
          </View>
        </Surface>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {activeSlide < SLIDES.length - 1 ? (
          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            style={styles.actionBtn}
            contentStyle={styles.btnContent}
            onPress={() => setActiveSlide(activeSlide + 1)}
          >
            {t.continue} →
          </Button>
        ) : (
          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            style={styles.actionBtn}
            contentStyle={styles.btnContent}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            {t.login} / {t.register}
          </Button>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login' as any)}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip directly to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: SPACING.base,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  slideCard: {
    width: '100%',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slideIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  slideTitle: {
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  slideDesc: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderStrong,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.secondary,
  },
  bottomBar: {
    width: '100%',
    gap: SPACING.md,
  },
  actionBtn: {
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 8,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
