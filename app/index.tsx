import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { can } from '../utils/permissions';
import { TRANSLATIONS } from '../constants/translations';
import { QuickBillLogo } from '../components/common/QuickBillLogo';
import { Zap } from '../components/common/Icons';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, language } = useAuthStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      isHydrated: s.isHydrated,
      language: s.language,
    }))
  );
  const { business, role, isRoleLoaded } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      role: s.role,
      isRoleLoaded: s.isRoleLoaded,
    }))
  );
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated && business && !isRoleLoaded) return;

    const navTimer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/onboarding' as any);
      } else if (!business) {
        router.replace('/business-setup' as any);
      } else if (!can(role, 'view_reports')) {
        router.replace('/(tabs)/new-bill' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }, 900);

    return () => clearTimeout(navTimer);
  }, [isHydrated, isAuthenticated, business, role, isRoleLoaded, router]);

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.ambientTopGlow} />
      <View style={styles.ambientBottomGlow} />

      {/* Main Center Stage */}
      <View style={styles.centerStage}>
        {/* Static Brand Logo Container */}
        <View style={styles.logoWrapper}>
          <QuickBillLogo size={118} />
        </View>

        {/* Brand Typography */}
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>
            Quick<Text style={styles.brandAccent}>Bill</Text>
          </Text>

          <View style={styles.posBadge}>
            <Zap size={10} color={COLORS.white} />
            <Text style={styles.posBadgeText}>POS</Text>
          </View>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>{t.tagline}</Text>
      </View>

      {/* Footer System Info */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={styles.statusDot} />
          <Text style={styles.footerText}>Cloud-Powered POS • Supabase</Text>
        </View>
        <Text style={styles.versionText}>v1.0 • Made for Retail Merchants</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
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
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },
  ambientBottomGlow: {
    position: 'absolute',
    bottom: -width * 0.5,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: COLORS.secondary,
    opacity: 0.22,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoWrapper: {
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
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
    color: COLORS.secondaryLight,
  },
  posBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.full,
    gap: 2,
    shadowColor: COLORS.secondary,
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
    color: COLORS.primaryContainer,
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
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
    backgroundColor: COLORS.secondaryLight,
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
