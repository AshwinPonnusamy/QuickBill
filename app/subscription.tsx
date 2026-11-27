import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Badge, Divider } from '../components/heroui';
import { useRouter, Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { staffService } from '../services/staff.service';
import { TRANSLATIONS } from '../constants/translations';
import { useCan } from '../utils/permissions';
import { safeGoBack } from '../utils/navigation';
import { Check, Sparkles, CheckCircle2, Zap, ShieldCheck } from '../components/common/Icons';

export default function SubscriptionScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const { business, subscription, isRoleLoaded, setSubscription } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      subscription: s.subscription,
      isRoleLoaded: s.isRoleLoaded,
      setSubscription: s.setSubscription,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  if (isRoleLoaded && !canDo('manage_subscription')) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const activePlan = subscription?.status === 'active' ? (subscription?.plan || 'free') : 'free';

  const PLAN_NAMES: Record<'starter' | 'pro' | 'pro_business', string> = {
    starter: 'QuickBill Starter',
    pro: 'QuickBill Pro',
    pro_business: 'QuickBill Pro Business',
  };

  const PLAN_SEATS: Record<'starter' | 'pro' | 'pro_business', number> = {
    starter: 5,
    pro: 15,
    pro_business: -1,
  };

  const executePlanChange = async (
    targetPlan: 'starter' | 'pro' | 'pro_business',
    suspendExtraIds: string[] = []
  ) => {
    if (!business) return;
    setIsProcessing(true);
    try {
      const res = await businessService.upgradeSubscription(business.id, targetPlan, cycle);
      if (res.success) {
        for (const memberId of suspendExtraIds) {
          await staffService.setStaffStatus(business.id, memberId, 'suspended');
        }
        const updated = await businessService.getSubscription(business.id);
        setSubscription(updated);
        const planName = PLAN_NAMES[targetPlan];
        const extraMsg =
          suspendExtraIds.length > 0
            ? ` ${suspendExtraIds.length} extra staff ${suspendExtraIds.length === 1 ? 'member was' : 'members were'} suspended to fit the ${updated.maxStaff < 0 ? 'unlimited' : updated.maxStaff}-seat limit.`
            : '';
        Alert.alert(
          t.success,
          `Your shop plan has been updated to ${planName}.${extraMsg}`,
          [{ text: 'OK', onPress: () => safeGoBack(router) }]
        );
      } else {
        Alert.alert(t.error, res.error || 'Plan update failed');
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async (targetPlan: 'starter' | 'pro' | 'pro_business') => {
    if (!business) return;
    const targetMaxSeats = PLAN_SEATS[targetPlan];

    setIsProcessing(true);
    try {
      const staffRes = await staffService.listStaff(business.id);
      const activeMembers = (staffRes.staff || []).filter((m) => m.status !== 'suspended');

      if (targetMaxSeats > 0 && activeMembers.length > targetMaxSeats) {
        const overCount = activeMembers.length - targetMaxSeats;
        const removableStaff = activeMembers
          .filter((m) => m.userId !== business.ownerId && m.role !== 'owner')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const extraIds = removableStaff.slice(0, overCount).map((m) => m.id);

        setIsProcessing(false);
        Alert.alert(
          `Active Staff Exceeds ${PLAN_NAMES[targetPlan]} Limit`,
          `You currently have ${activeMembers.length} active team members, but ${PLAN_NAMES[targetPlan]} supports ${targetMaxSeats} seats (including owner).`,
          [
            { text: t.cancel, style: 'cancel' },
            {
              text: 'Manage Staff',
              onPress: () => router.push('/manage-staff' as any),
            },
            {
              text: `Switch & Suspend ${extraIds.length}`,
              style: 'destructive',
              onPress: () => void executePlanChange(targetPlan, extraIds),
            },
          ]
        );
        return;
      }
    } catch {
      // Proceed to plan change if staff pre-check fails
    }

    await executePlanChange(targetPlan);
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
                {activePlan === 'pro_business'
                  ? 'QuickBill Pro Business'
                  : activePlan === 'pro'
                  ? 'QuickBill Pro'
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
              color={
                activePlan === 'pro_business' || activePlan === 'pro'
                  ? 'secondary'
                  : activePlan === 'starter'
                  ? 'warning'
                  : 'default'
              }
              variant="flat"
              size="md"
            >
              {activePlan === 'pro_business' ? 'PRO BUSINESS' : activePlan.toUpperCase()}
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
              <Text style={styles.featureItemBold}>Up to 5 Team Seats</Text>
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
        {/* PLAN 3: PRO PLAN (₹299) */}
        {/* ------------------------------------------------------------------ */}
        <Card radius="xl" shadow="md" style={[styles.planCard, styles.proCard, activePlan === 'pro' && styles.activePlanOutline]}>
          <View style={styles.badgeWrapper}>
            <View style={styles.proBadge}>
              <Text style={styles.badgeText}>BEST FOR GROWING SHOPS</Text>
            </View>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, { color: COLORS.primary }]}>QuickBill Pro</Text>
              <Text style={styles.planSubDesc}>Multi-counter retail & busy stores</Text>
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
              <Text style={styles.featureItemBold}>Up to 15 Team Seats</Text>
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

        {/* ------------------------------------------------------------------ */}
        {/* PLAN 4: PRO BUSINESS PLAN (₹499) */}
        {/* ------------------------------------------------------------------ */}
        <Card radius="xl" shadow="md" style={[styles.planCard, styles.proCard, activePlan === 'pro_business' && styles.activePlanOutline]}>
          <View style={styles.badgeWrapper}>
            <View style={[styles.proBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.badgeText}>MAX CAPACITY • MULTI-COUNTER</Text>
            </View>
          </View>

          <View style={styles.planHeader}>
            <View>
              <Text style={[styles.planName, { color: COLORS.primary }]}>QuickBill Pro Business</Text>
              <Text style={styles.planSubDesc}>Large supermarkets, chains & high-volume POS</Text>
            </View>
            <Text style={[styles.planPrice, { color: COLORS.primary }]}>
              {cycle === 'monthly' ? '₹499' : '₹4,199'}
            </Text>
          </View>

          <Text style={styles.cycleSubPrice}>
            {cycle === 'monthly' ? '₹499 / Month (Billed Monthly)' : '₹4,199 / Year (Save 30% • ₹350/mo)'}
          </Text>

          <Divider style={{ marginVertical: SPACING.md }} />

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>Unlimited Team Seats</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureReports}</Text>
            </View>
            <View style={styles.featureRow}>
              <Sparkles size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>{t.proFeatureCloud}</Text>
            </View>
            <View style={styles.featureRow}>
              <ShieldCheck size={16} color={COLORS.success} style={{ marginRight: 8 }} />
              <Text style={styles.featureItemBold}>Priority Dedicated Support & Onboarding</Text>
            </View>
          </View>

          {activePlan === 'pro_business' ? (
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
              onPress={() => handleUpgrade('pro_business')}
            >
              {cycle === 'monthly' ? 'Upgrade to Pro Business (₹499 / Month)' : 'Upgrade to Pro Business (₹4,199 / Year)'}
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
