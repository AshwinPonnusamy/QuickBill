import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { TRANSLATIONS } from '../constants/translations';
import { QuickBillLogo } from '../components/common/QuickBillLogo';
import { Zap } from '../components/common/Icons';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Animation values
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-12)).current;

  // Pulse ring animation
  const pulseScale1 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.6)).current;
  const pulseScale2 = useRef(new Animated.Value(0.85)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.4)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.6)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isCancelled = false;

    // 1. Start continuous pulse rings loop
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale1, {
              toValue: 1.55,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity1, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale1, { toValue: 0.85, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(pulseScale2, {
              toValue: 1.75,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity2, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale2, { toValue: 0.85, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseOpacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    pulseLoop.start();

    // 2. Main entrance choreography
    Animated.sequence([
      // Logo spring in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 45,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),

      // Title & Badge reveal
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),

      // Tagline & Footer
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // 3. Navigation sequence after warm-up
    const navTimer = setTimeout(() => {
      if (isCancelled) return;

      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (!isAuthenticated) {
          router.replace('/(auth)/onboarding' as any);
        } else if (!business) {
          router.replace('/business-setup' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      });
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(navTimer);
      pulseLoop.stop();
    };
  }, [isAuthenticated, business]);

  const spin = logoRotate.interpolate({
    inputRange: [-15, 0],
    outputRange: ['-15deg', '0deg'],
  });

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Decorative Background Elements */}
      <View style={styles.ambientTopGlow} />
      <View style={styles.ambientBottomGlow} />

      {/* Main Center Stage */}
      <View style={styles.centerStage}>
        {/* Animated Concentric Pulse Rings */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale1 }],
              opacity: pulseOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale2 }],
              opacity: pulseOpacity2,
            },
          ]}
        />

        {/* Brand Logo Container with Spring & Rotation */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { rotate: spin }],
            },
          ]}
        >
          <QuickBillLogo size={118} />
        </Animated.View>

        {/* Animated Brand Typography */}
        <Animated.View
          style={[
            styles.titleRow,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleSlide }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            Quick<Text style={styles.brandAccent}>Bill</Text>
          </Text>

          {/* POS Pill Badge */}
          <Animated.View
            style={[
              styles.posBadge,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Zap size={10} color={COLORS.white} />
            <Text style={styles.posBadgeText}>POS</Text>
          </Animated.View>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Instant 3-Tap Retail Billing
        </Animated.Text>

        {/* Sleek Progress Bar Indicator */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
        </View>
      </View>

      {/* Footer System Info */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <View style={styles.footerRow}>
          <View style={styles.statusDot} />
          <Text style={styles.footerText}>Offline-First Engine • Supabase Sync</Text>
        </View>
        <Text style={styles.versionText}>v1.0 • Made for Retail Merchants</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3730A3', // Deep indigo canvas
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    overflow: 'hidden',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -width * 0.45,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    backgroundColor: '#6366F1',
    opacity: 0.35,
  },
  ambientBottomGlow: {
    position: 'absolute',
    bottom: -width * 0.5,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: '#0D9488',
    opacity: 0.22,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#818CF8',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  logoWrapper: {
    marginBottom: SPACING.lg,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
  },
  brandTitle: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 34,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#2DD4BF', // Electric teal
  },
  posBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.full,
    gap: 2,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  posBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tagline: {
    color: '#E0E7FF',
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: 120,
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: SPACING.xl,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2DD4BF',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 30,
    alignItems: 'center',
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DD4BF',
  },
  footerText: {
    color: 'rgba(224, 231, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  versionText: {
    color: 'rgba(224, 231, 255, 0.45)',
    fontSize: 10,
  },
});
