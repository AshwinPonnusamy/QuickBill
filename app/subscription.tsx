import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Badge, Divider } from '../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { Check, Sparkles, CheckCircle2 } from '../components/common/Icons';

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
        <Card radius="lg" shadow="sm" style={styles.currentCard}>
          <Text style={styles.currentLabel}>{t.currentPlan}:</Text>
          <Text style={styles.currentPlanName}>
            {isProActive ? '⭐ QuickBill Pro Business' : 'QuickBill Free Plan'}
          </Text>
          {subscription?.expiresAt ? (
            <Text style={styles.renewalText}>
              Renewal: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
            </Text>
          ) : null}
        </Card>

        {/* Plan Pricing Toggle */}
        <View style={styles.cycleToggle}>
          <Button
            variant={cycle === 'monthly' ? 'solid' : 'bordered'}
            color={cycle === 'monthly' ? 'secondary' : 'default'}
            size="md"
            radius="md"
            style={{ flex: 1 }}
            onPress={() => setCycle('monthly')}
          >
            Monthly (₹299)
          </Button>

          <Button
            variant={cycle === 'yearly' ? 'solid' : 'bordered'}
            color={cycle === 'yearly' ? 'secondary' : 'default'}
            size="md"
            radius="md"
            style={{ flex: 1 }}
            onPress={() => setCycle('yearly')}
          >
            Yearly (₹2,499) • Save 30%
          </Button>
        </View>

        {/* Comparison Plan Cards */}
        {/* 1. FREE PLAN */}
        <Card radius="xl" shadow="sm" style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{t.freePlan}</Text>
            <Text style={styles.planPrice}>₹0 / Forever</Text>
          </View>
          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Unlimited offline billing</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Product catalog & stock management</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>WhatsApp PDF & Thermal receipt printing</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Basic daily/weekly sales reports</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>1 Device & 1 Staff access</Text>
            </View>
          </View>
        </Card>

        {/* 2. PRO PLAN */}
        <Card radius="xl" shadow="md" style={[styles.planCard, styles.proCard]}>
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
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureCloud}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureStaff} (Up to 5 staff accounts)</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureReports}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureTemplates}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemBold}>Priority phone & WhatsApp support</Text>
            </View>
          </View>

          {!isProActive ? (
            <Button
              color="secondary"
              size="lg"
              radius="md"
              fullWidth
              isLoading={isProcessing}
              style={styles.upgradeBtn}
              onPress={handleUpgrade}
            >
              {t.upgradeToPro}
            </Button>
          ) : (
            <View style={styles.activeBanner}>
              <CheckCircle2 size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.activeBannerText}>You are already enjoying Pro Benefits</Text>
            </View>
          )}
        </Card>

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
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    gap: 8,
    marginBottom: SPACING.lg,
  },
  planCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  featureItemBold: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  upgradeBtn: {
    marginTop: SPACING.sm,
  },
  activeBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    justifyContent: 'center',
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
