import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { TRANSLATIONS } from '../constants/translations';
import { Receipt } from '../components/common/Icons';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/onboarding' as any);
      } else if (!business) {
        router.replace('/business-setup' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isAuthenticated, business]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Receipt size={44} color={COLORS.secondary} />
      </View>
      <Text variant="headlineLarge" style={styles.title}>
        {t.appName}
      </Text>
      <Text variant="bodyMedium" style={styles.tagline}>
        {t.tagline}
      </Text>

      <ActivityIndicator size="small" color={COLORS.secondary} style={styles.loader} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Offline-First Billing Engine • Supabase</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    color: COLORS.white,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#94A3B8',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
  },
});

