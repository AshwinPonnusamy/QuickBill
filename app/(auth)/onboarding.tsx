import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⚡',
    titleEn: 'Lightning Fast Billing',
    titleTa: 'மின்னல் வேக பில்லிங்',
    descEn: 'Generate retail bills in 3 quick taps. Easy barcode and quick product lookup.',
    descTa: '3 எளிய தொடுதல்களில் பில் தயாரிக்கவும். விரைவான பார்கோடு மற்றும் பொருள் தேர்வு.',
  },
  {
    icon: '📶',
    titleEn: '100% Offline-First',
    titleTa: 'முழுமையான ஆஃப்லைன் பில்லிங்',
    descEn: 'Never stop billing even with zero internet. Bills automatically sync to the cloud later.',
    descTa: 'இணையம் இல்லாவிட்டாலும் பில்லிங் நிற்காது. இணையம் வந்ததும் தானாக ஒத்திசைவு ஆகும்.',
  },
  {
    icon: '🖨️',
    titleEn: 'Thermal & WhatsApp PDF',
    titleTa: 'தெர்மல் பிரிண்ட் & வாட்ஸ்அப் ரசீது',
    descEn: 'Instant Bluetooth thermal receipt printing and one-tap WhatsApp PDF sharing.',
    descTa: 'புளூடூத் அச்சுப்பொறி மூலம் ரசீது அச்சிடலாம் மற்றும் வாட்ஸ்அப்பில் பகிரலாம்.',
  },
  {
    icon: '📒',
    titleEn: 'Udhar & Customer Ledger',
    titleTa: 'உதார் & வாடிக்கையாளர் கணக்கு',
    descEn: 'Track customer credit, pending payments, and send automatic payment reminders.',
    descTa: 'வாடிக்கையாளர் கடன் பாக்கி மற்றும் நிலுவைத் தொகையை எளிதாகக் கண்காணிக்கவும்.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useAuthStore();
  const t = TRANSLATIONS[language];
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Text style={styles.brandTitle}>QuickBill</Text>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => router.push('/(auth)/language' as any)}
        >
          <Text style={styles.langBtnText}>{language === 'en' ? 'தமிழ்' : 'English'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Card */}
      <View style={styles.slideContainer}>
        <Surface style={styles.slideCard} elevation={2}>
          <Text style={styles.slideIcon}>{slide.icon}</Text>
          <Text variant="headlineSmall" style={styles.slideTitle}>
            {language === 'ta' ? slide.titleTa : slide.titleEn}
          </Text>
          <Text variant="bodyMedium" style={styles.slideDesc}>
            {language === 'ta' ? slide.descTa : slide.descEn}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.primaryContainer,
  },
  langBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
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
  slideIcon: {
    fontSize: 64,
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

