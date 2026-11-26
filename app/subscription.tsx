import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Badge, Divider } from '../components/heroui';
import { useRouter, Redirect } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { useCan } from '../utils/permissions';
import { safeGoBack } from '../utils/navigation';
import { Check, Sparkles, CheckCircle2, Zap, ShieldCheck } from '../components/common/Icons';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business, subscription, isRoleLoaded, setSubscription } = useBusinessStore();
  const canDo = useCan();
  const t = TRANSLATIONS[language];

  if (isRoleLoaded && !canDo('manage_subscription')) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const activePlan = subscription?.status === 'active' ? (subscription?.plan || 'free') : 'free';

  const handleUpgrade = async (targetPlan: 'starter' | 'pro') => {
    if (!business) return;
    setIsProcessing(true);
    try {
      const res = await businessService.upgradeSubscription(business.id, targetPlan, cycle);
      if (res.success) {
        const updated = await businessService.getSubscription(business.id);
        setSubscription(updated);
        const planName = targetPlan === 'pro' ? 'QuickBill Pro Business' : 'QuickBill Starter';
        Alert.alert(
          t.success,
          `Congratulations! Your shop has been successfully upgraded to ${planName}.`,
          [{ text: 'OK', onPress: () => safeGoBack(router) }]
        );
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
        {/* Current Plan Overview Banner */}
        <Card radius="lg" shadow="sm" style={styles.currentCard}>
          <View style={styles.currentCardRow}>
            <View>
              <Text style={styles.currentLabel}>{t.currentPlan}</Text>
              <Text style={styles.currentPlanName}>
                {activePlan === 'pro'
                  ? 'QuickBill Pro Business'
                  : activePlan === 'starter'
                  ? 'QuickBill Starter Retail'
                  : 'QuickBill Free Plan'}
              </Text>
              {subscription?.expiresAt && activePlan !== 'free' ? (
                <Text style={styles.renewalText}>
                  Valid until: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
                </Text>
              ) : (
                <Text style={styles.renewalText}>Standard cloud billing features active</Text>
              )}
            </View>
            <Badge
              color={activePlan === 'pro' ? 'secondary' : activePlan === 'starter' ? 'warning' : 'default'}
              variant="flat"
              size="md"
            >
              {activePlan.toUpperCase()}
            </Badge>
          </View>
        </Card>

        {/* Billing Cycle Switcher */}
        <View style={styles.cycleToggle}>
          <Button
            variant={cycle === 'monthly' ? 'solid' : 'bordered'}
            color={cycle === 'monthly' ? 'secondary' : 'default'}
            size="md"
            radius="md"
            style={{ flex: 1 }}
            onPress={() => setCycle('monthly')}
          >
            Monthly Billing
          </Button>

          <Button
            variant={cycle === 'yearly' ? 'solid' : 'bordered'}
            color={cycle === 'yearly' ? 'secondary' : 'default'}
            size="md"
            radius="md"
            style={{ flex: 1 }}
            onPress={() => setCycle('yearly')}
          >
            Yearly Billing (Save up to 30%)
          </Button>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* PLAN 1: FREE PLAN (₹0) */}
        {/* ------------------------------------------------------------------ */}
        <Card radius="xl" shadow="sm" style={[styles.planCard, activePlan === 'free' && styles.activePlanOutline]}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{t.freePlan}</Text>
              <Text style={styles.planSubDesc}>Ideal for micro-stalls & individual billing</Text>
            </View>
            <Text style={styles.planPrice}>₹0</Text>
          </View>

          <Text style={styles.cycleSubPrice}>
            {cycle === 'monthly' ? '₹0 / Month • Free Forever' : '₹0 / Year • Free Forever'}
          </Text>

          <Divider style={{ marginVertical: SPACING.md }} />

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Real-time Supabase cloud billing</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Unlimited bills & customer receipts</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Product catalog & inventory tracking</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Thermal Bluetooth printing & WhatsApp PDF</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Single cashier device access</Text>
            </View>
          </View>

          {activePlan === 'free' ? (
            <View style={styles.activeBanner}>
              <CheckCircle2 size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.activeBannerText}>Current Active Plan</Text>
            </View>
          ) : (
            <Button
              variant="bordered"
              color="default"
              size="md"
              radius="md"
              fullWidth
              isDisabled
              style={styles.planBtn}
            >
              Default Plan
            </Button>
          )}
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* PLAN 2: STARTER PLAN (₹99) */}
        {/* ------------------------------------------------------------------ */}
        <Card radius="xl" shadow="sm" style={[styles.planCard, styles.starterCard, activePlan === 'starter' && styles.activePlanOutline]}>
          <View style={styles.badgeWrapper}>
            <View style={styles.starterBadge}>
              <Text style={styles.badgeText}>POPULAR FOR RETAIL SHOPS</Text>
            </View>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, { color: COLORS.primary }]}>{t.starterPlan}</Text>
              <Text style={styles.planSubDesc}>Perfect for grocery, tea shops & bakeries</Text>
            </View>
            <Text style={[styles.planPrice, { color: COLORS.secondary }]}>
              {cycle === 'monthly' ? '₹99' : '₹999'}
            </Text>
          </View>

          <Text style={styles.cycleSubPrice}>
            {cycle === 'monthly' ? '₹99 / Month (Billed Monthly)' : '₹999 / Year (Save 15% • ₹83/mo)'}
          </Text>

          <Divider style={{ marginVertical: SPACING.md }} />

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Zap size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.starterFeatureCloud}</Text>
            </View>
            <View style={styles.featureRow}>
              <Zap size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.starterFeatureUdhar}</Text>
            </View>
            <View style={styles.featureRow}>
              <Zap size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.starterFeatureStaff}</Text>
            </View>
            <View style={styles.featureRow}>
              <Zap size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.starterFeatureAlerts}</Text>
            </View>
            <View style={styles.featureRow}>
              <Check size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItem}>Digital Dynamic UPI QR code on bill</Text>
            </View>
          </View>

          {activePlan === 'starter' ? (
            <View style={styles.activeBanner}>
              <CheckCircle2 size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.activeBannerText}>Current Active Plan</Text>
            </View>
          ) : (
            <Button
              color="secondary"
              size="lg"
              radius="md"
              fullWidth
              isLoading={isProcessing}
              style={styles.planBtn}
              onPress={() => handleUpgrade('starter')}
            >
              {cycle === 'monthly' ? 'Get Starter (₹99 / Month)' : 'Get Starter (₹999 / Year)'}
            </Button>
          )}
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* PLAN 3: PRO BUSINESS PLAN (₹299) */}
        {/* ------------------------------------------------------------------ */}
        <Card radius="xl" shadow="md" style={[styles.planCard, styles.proCard, activePlan === 'pro' && styles.activePlanOutline]}>
          <View style={styles.badgeWrapper}>
            <View style={styles.proBadge}>
              <Text style={styles.badgeText}>BEST FOR GROWING BUSINESSES</Text>
            </View>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, { color: COLORS.primary }]}>{t.proPlan}</Text>
              <Text style={styles.planSubDesc}>Multi-counter supermarkets & restaurants</Text>
            </View>
            <Text style={[styles.planPrice, { color: COLORS.secondaryDark }]}>
              {cycle === 'monthly' ? '₹299' : '₹2,499'}
            </Text>
          </View>

          <Text style={styles.cycleSubPrice}>
            {cycle === 'monthly' ? '₹299 / Month (Billed Monthly)' : '₹2,499 / Year (Save 30% • ₹208/mo)'}
          </Text>

          <Divider style={{ marginVertical: SPACING.md }} />

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureReports}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureStaff}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureCloud}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureTemplates}</Text>
            </View>
            <View style={styles.featureRow}>
              <ShieldCheck size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureSupport}</Text>
            </View>
          </View>

          {activePlan === 'pro' ? (
            <View style={styles.activeBanner}>
              <CheckCircle2 size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.activeBannerText}>Current Active Plan</Text>
            </View>
          ) : (
            <Button
              color="primary"
              size="lg"
              radius="md"
              fullWidth
              isLoading={isProcessing}
              style={styles.planBtn}
              onPress={() => handleUpgrade('pro')}
            >
              {cycle === 'monthly' ? 'Upgrade to Pro (₹299 / Month)' : 'Upgrade to Pro (₹2,499 / Year)'}
            </Button>
          )}
        </Card>

        {/* Restore Purchases Button */}
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
  currentCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentPlanName: {
    fontSize: 17,
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
    backgroundColor: COLORS.white,
  },
  activePlanOutline: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  starterCard: {
    borderColor: COLORS.secondary,
    borderWidth: 1.5,
    backgroundColor: '#F0FDFA',
  },
  proCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EEF2FF',
  },
  badgeWrapper: {
    alignItems: 'center',
    marginTop: -28,
    marginBottom: 8,
  },
  starterBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
    borderRadius: ROUNDNESS.full,
  },
  proBadge: {
    backgroundColor: COLORS.secondaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
    borderRadius: ROUNDNESS.full,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  planSubDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  cycleSubPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  featuresList: {
    gap: 10,
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
  planBtn: {
    marginTop: SPACING.sm,
  },
  activeBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  activeBannerText: {
    color: COLORS.success,
    fontWeight: 'bold',
    fontSize: 13,
  },
  restoreBtn: {
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingVertical: 10,
  },
  restoreText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
