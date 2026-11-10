import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business, subscription, setSubscription } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  const isProActive = subscription?.plan === 'pro' && subscription.status === 'active';

  const handleUpgrade = async () => {
    if (!business) return;
    setIsProcessing(true);
    try {
      const res = await businessService.upgradeSubscription(business.id, 'pro', cycle);
      if (res.success) {
        const updated = await businessService.getSubscription(business.id);
        setSubscription(updated);
        Alert.alert(t.success, 'Congratulations! Your shop has been upgraded to QuickBill Pro Business Plan.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t.error, res.error || 'Upgrade failed');
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!business) return;
    setIsProcessing(true);
    try {
      const updated = await businessService.getSubscription(business.id);
      setSubscription(updated);
      Alert.alert(t.success, 'Subscription state verified and restored.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.subscriptionTitle} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Plan Badge */}
        <Surface style={styles.currentCard} elevation={1}>
          <Text style={styles.currentLabel}>{t.currentPlan}:</Text>
          <Text style={styles.currentPlanName}>
            {isProActive ? '⭐ QuickBill Pro Business' : 'QuickBill Free Plan'}
          </Text>
          {subscription?.expiresAt ? (
            <Text style={styles.renewalText}>
              Renewal: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
            </Text>
          ) : null}
        </Surface>

        {/* Plan Pricing Toggle */}
        <View style={styles.cycleToggle}>
          <TouchableOpacity
            onPress={() => setCycle('monthly')}
            style={[styles.cycleBtn, cycle === 'monthly' && styles.activeCycleBtn]}
          >
            <Text style={[styles.cycleText, cycle === 'monthly' && styles.activeCycleText]}>
              Monthly (₹299)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCycle('yearly')}
            style={[styles.cycleBtn, cycle === 'yearly' && styles.activeCycleBtn]}
          >
            <Text style={[styles.cycleText, cycle === 'yearly' && styles.activeCycleText]}>
              Yearly (₹2,499) • Save 30%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comparison Plan Cards */}
        {/* 1. FREE PLAN */}
        <Surface style={styles.planCard} elevation={1}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{t.freePlan}</Text>
            <Text style={styles.planPrice}>₹0 / Forever</Text>
          </View>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>✓ Unlimited offline billing</Text>
            <Text style={styles.featureItem}>✓ Product catalog & stock management</Text>
            <Text style={styles.featureItem}>✓ WhatsApp PDF & Thermal receipt printing</Text>
            <Text style={styles.featureItem}>✓ Basic daily/weekly sales reports</Text>
            <Text style={styles.featureItem}>✓ 1 Device & 1 Staff access</Text>
          </View>
        </Surface>

        {/* 2. PRO PLAN */}
        <Surface style={[styles.planCard, styles.proCard]} elevation={3}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>RECOMMENDED FOR RETAILERS</Text>
          </View>

          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: COLORS.primary }]}>{t.proPlan}</Text>
            <Text style={[styles.planPrice, { color: COLORS.secondary }]}>
              {cycle === 'yearly' ? '₹2,499 / Year' : '₹299 / Month'}
            </Text>
          </View>

          <View style={styles.featuresList}>
            <Text style={styles.featureItemBold}>⭐ {t.proFeatureCloud}</Text>
            <Text style={styles.featureItemBold}>⭐ {t.proFeatureStaff} (Up to 5 staff accounts)</Text>
            <Text style={styles.featureItemBold}>⭐ {t.proFeatureReports}</Text>
            <Text style={styles.featureItemBold}>⭐ {t.proFeatureTemplates}</Text>
            <Text style={styles.featureItemBold}>⭐ Priority phone & WhatsApp support</Text>
          </View>

          {!isProActive ? (
            <Button
              mode="contained"
              buttonColor={COLORS.secondary}
              textColor={COLORS.white}
              loading={isProcessing}
              disabled={isProcessing}
              style={styles.upgradeBtn}
              contentStyle={styles.btnContent}
              onPress={handleUpgrade}
            >
              {t.upgradeToPro}
            </Button>
          ) : (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerText}>✓ You are already enjoying Pro Benefits</Text>
            </View>
          )}
        </Surface>

        {/* Restore Purchases */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>{t.restorePurchases}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  currentCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  renewalText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  cycleToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceVariant,
    padding: 4,
    borderRadius: ROUNDNESS.lg,
    marginBottom: SPACING.lg,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: ROUNDNESS.md,
  },
  activeCycleBtn: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cycleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeCycleText: {
    color: COLORS.primary,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  proCard: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
    backgroundColor: '#FAFDFF',
  },
  proBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.full,
  },
  proBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: SPACING.md,
    marginTop: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  featuresList: {
    gap: 8,
    marginBottom: SPACING.md,
  },
  featureItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  featureItemBold: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  upgradeBtn: {
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 6,
  },
  activeBanner: {
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
  },
  activeBannerText: {
    color: COLORS.success,
    fontWeight: 'bold',
    fontSize: 13,
  },
  restoreBtn: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingVertical: 10,
  },
  restoreText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

