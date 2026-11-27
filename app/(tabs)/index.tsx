import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Text } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { Card, Button, Badge } from '../../components/heroui';
import { useRouter, Redirect } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { billingService } from '../../services/billing.service';
import { productService } from '../../services/product.service';
import { reportService } from '../../services/report.service';
import { businessService } from '../../services/business.service';
import { formatRupees } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { useCan, RoleGate } from '../../utils/permissions';
import { Invoice } from '../../types';
import {
  Zap,
  IndianRupee,
  Receipt,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PackagePlus,
  Users,
  ArrowRight,
  Sparkles,
} from '../../components/common/Icons';

export default function HomeDashboard() {
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
  const { products, setProducts, setCategories } = useProductStore(
    useShallow((s) => ({
      products: s.products,
      setProducts: s.setProducts,
      setCategories: s.setCategories,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canViewReports = canDo('view_reports');

  const loadDashboardData = useCallback(async () => {
    if (!business || !canViewReports) return;
    setIsRefreshing(true);
    try {
      const [invs, sub, prods, cats] = await Promise.all([
        billingService.getInvoices(business.id, { limit: 100, withItems: false, withPayments: true }),
        businessService.getSubscription(business.id),
        productService.getProducts(business.id),
        productService.getCategories(business.id),
      ]);
      setInvoices(invs);
      if (sub) setSubscription(sub);
      setProducts(prods);
      setCategories(cats);
    } finally {
      setIsRefreshing(false);
    }
  }, [business, canViewReports, setSubscription, setProducts, setCategories]);

  useEffect(() => {
    if (!business || !canViewReports) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setIsRefreshing(true);
        return Promise.all([
          billingService.getInvoices(business.id, { limit: 100, withItems: false, withPayments: true }),
          businessService.getSubscription(business.id),
          productService.getProducts(business.id),
          productService.getCategories(business.id),
        ]);
      })
      .then((res) => {
        if (cancelled || !res) return;
        const [invs, sub, prods, cats] = res;
        setInvoices(invs);
        if (sub) setSubscription(sub);
        setProducts(prods);
        setCategories(cats);
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [business, canViewReports, setSubscription, setProducts, setCategories]);

  // Compute metrics in useMemo (must run unconditionally before any Redirect)
  const report = useMemo(() => reportService.generateReport(invoices, 'weekly'), [invoices]);
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.lowStockThreshold),
    [products]
  );

  // Recent 5 transactions
  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  if (isRoleLoaded && !canViewReports) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const isProBusinessPlan = subscription?.status === 'active' && subscription.plan === 'pro_business';
  const isProPlan = subscription?.status === 'active' && subscription.plan === 'pro';
  const planLabel = isProBusinessPlan
    ? 'PRO BUSINESS'
    : isProPlan
    ? 'PRO PLAN'
    : subscription?.plan === 'starter'
    ? 'STARTER'
    : 'FREE PLAN';

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadDashboardData} />}
      >
        {/* Modern Elevated Hero Card */}
        <Card radius="xl" shadow="md" style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroStoreInfo}>
              <Text style={styles.heroOwnerGreeting}>
                Hello, {business?.ownerName || 'Merchant'}
              </Text>
              <Text style={styles.heroStoreName} numberOfLines={1}>
                {business?.name || 'QuickBill Store'}
              </Text>
            </View>

            <RoleGate permission="manage_subscription">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/subscription' as any)}
              >
                <Badge
                  color={isProPlan ? 'secondary' : 'default'}
                  variant="solid"
                  size="sm"
                  startContent={<Sparkles size={11} color={COLORS.white} />}
                  style={styles.planBadge}
                >
                  {planLabel}
                </Badge>
              </TouchableOpacity>
            </RoleGate>
          </View>

          {/* Today's Sales Stat inside Hero */}
          <View style={styles.heroRevenueBlock}>
            <Text style={styles.heroRevenueCaption}>{t.todaySales}</Text>
            <Text style={styles.heroRevenueValue}>
              {formatRupees(report.totalRevenuePaise)}
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Receipt size={13} color={COLORS.textMuted} />
                <Text style={styles.heroMetaText}>
                  {report.totalBills} bills today
                </Text>
              </View>
              <Text style={styles.heroMetaDivider}>•</Text>
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaText}>
                  Avg: {formatRupees(report.averageBillValuePaise)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Billing Primary Action Button */}
          <Button
            color="secondary"
            size="lg"
            radius="lg"
            fullWidth
            startContent={<Zap size={22} color={COLORS.white} />}
            style={styles.heroCtaBtn}
            onPress={() => router.push('/(tabs)/new-bill' as any)}
          >
            {t.newBill} (3-TAP POS)
          </Button>
        </Card>

        {/* Financial Metrics 2x2 Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Today&apos;s Snapshot</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/reports' as any)}>
            <Text style={styles.sectionLink}>Full Reports →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          {/* Revenue Card */}
          <Card radius="lg" shadow="sm" style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Text style={styles.metricLabel}>{t.todaySales}</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.primaryContainer }]}>
                <IndianRupee size={16} color={COLORS.primary} />
              </View>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.primary }]}>
              {formatRupees(report.totalRevenuePaise)}
            </Text>
            <Text style={styles.metricSub}>{report.totalBills} completed orders</Text>
          </Card>

          {/* Bills Card */}
          <Card radius="lg" shadow="sm" style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Text style={styles.metricLabel}>Total Bills</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.secondaryContainer }]}>
                <Receipt size={16} color={COLORS.secondary} />
              </View>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.secondary }]}>
              {report.totalBills}
            </Text>
            <Text style={styles.metricSub}>Avg {formatRupees(report.averageBillValuePaise)}</Text>
          </Card>

          {/* Cash / Digital Collected */}
          <Card radius="lg" shadow="sm" style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Text style={styles.metricLabel}>{t.paidAmount}</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.successLight }]}>
                <CheckCircle2 size={16} color={COLORS.success} />
              </View>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.success }]}>
              {formatRupees(report.cashPaymentsPaise + report.upiPaymentsPaise + report.cardPaymentsPaise)}
            </Text>
            <Text style={styles.metricSub}>Settled instantly</Text>
          </Card>

          {/* Udhar / Unpaid Credit */}
          <Card radius="lg" shadow="sm" style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Text style={styles.metricLabel}>{t.pendingPayments}</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.errorLight }]}>
                <AlertCircle size={16} color={COLORS.error} />
              </View>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.error }]}>
              {formatRupees(report.pendingUdharPaise)}
            </Text>
            <Text style={styles.metricSub}>Pending Udhar</Text>
          </Card>
        </View>

        {/* Low Stock Warning Card */}
        {lowStockProducts.length > 0 ? (
          <Card radius="lg" shadow="sm" style={styles.stockAlertCard}>
            <View style={styles.stockAlertHeader}>
              <View style={styles.stockAlertTitleRow}>
                <AlertTriangle size={18} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.stockAlertTitle}>
                  {t.lowStockAlerts} ({lowStockProducts.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/products' as any)}>
                <Text style={styles.stockAlertAction}>Restock →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockPillScroll}>
              {lowStockProducts.map((p) => (
                <View key={p.id} style={styles.stockPill}>
                  <Text style={styles.stockPillName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.stockPillQty}>
                    {p.stockQuantity} {p.unit} left
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Card>
        ) : null}

        {/* Quick Operational Actions */}
        <View style={styles.quickHubSection}>
          <Text style={styles.sectionHeaderTitle}>{t.quickActions}</Text>
          <View style={styles.quickGrid}>
            <RoleGate permission="manage_products">
              <Card
                isPressable
                radius="lg"
                shadow="sm"
                onPress={() => router.push('/(tabs)/products' as any)}
                style={styles.quickTile}
              >
                <View style={[styles.quickTileIcon, { backgroundColor: COLORS.primaryContainer }]}>
                  <PackagePlus size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.quickTileLabel}>{t.addProduct}</Text>
              </Card>
            </RoleGate>

            <RoleGate permission="settle_udhar">
              <Card
                isPressable
                radius="lg"
                shadow="sm"
                onPress={() => router.push('/customers' as any)}
                style={styles.quickTile}
              >
                <View style={[styles.quickTileIcon, { backgroundColor: COLORS.successLight }]}>
                  <Users size={22} color={COLORS.success} />
                </View>
                <Text style={styles.quickTileLabel}>Udhar</Text>
              </Card>
            </RoleGate>

            <RoleGate permission="manage_staff">
              <Card
                isPressable
                radius="lg"
                shadow="sm"
                onPress={() => router.push('/manage-staff' as any)}
                style={styles.quickTile}
              >
                <View style={[styles.quickTileIcon, { backgroundColor: COLORS.secondaryContainer }]}>
                  <Users size={22} color={COLORS.secondary} />
                </View>
                <Text style={styles.quickTileLabel}>Staff</Text>
              </Card>
            </RoleGate>

            <RoleGate permission="manage_subscription">
              <Card
                isPressable
                radius="lg"
                shadow="sm"
                onPress={() => router.push('/subscription' as any)}
                style={styles.quickTile}
              >
                <View style={[styles.quickTileIcon, { backgroundColor: COLORS.accentLight }]}>
                  <Sparkles size={22} color={COLORS.accent} />
                </View>
                <Text style={styles.quickTileLabel}>Plans</Text>
              </Card>
            </RoleGate>
          </View>
        </View>

        {/* Recent Transactions Live Feed */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>{t.recentTransactions}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bills' as any)} style={styles.viewAllBtn}>
              <Text style={styles.sectionLink}>{t.viewAll}</Text>
              <ArrowRight size={14} color={COLORS.secondary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {recentInvoices.length === 0 ? (
            <Card radius="lg" shadow="sm" style={styles.emptyCard}>
              <Receipt size={36} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No bills created yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the POS button above to generate your first invoice in 3 taps!
              </Text>
            </Card>
          ) : (
            recentInvoices.map((inv) => (
              <Card
                key={inv.id}
                isPressable
                onPress={() => router.push('/(tabs)/bills' as any)}
                radius="lg"
                shadow="sm"
                style={styles.invoiceRow}
              >
                <View style={styles.invLeft}>
                  <View style={styles.invHeaderRow}>
                    <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                  </View>
                  <Text style={styles.invCust} numberOfLines={1}>
                    {inv.customerName || 'Walk-in Customer'} • {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.invRight}>
                  <Text style={styles.invAmount}>{formatRupees(inv.grandTotalPaise)}</Text>
                  <Badge
                    color={inv.paymentMethod === 'credit' ? 'danger' : 'default'}
                    variant="flat"
                    size="sm"
                    style={{ marginTop: 3 }}
                  >
                    {inv.paymentMethod.toUpperCase()}
                  </Badge>
                </View>
              </Card>
            ))
          )}
        </View>
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
    paddingBottom: 48,
  },
  // Hero Banner
  heroBanner: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.xl,
    marginBottom: SPACING.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  heroStoreInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  heroOwnerGreeting: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  heroStoreName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroRevenueBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroRevenueCaption: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRevenueValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  heroMetaDivider: {
    color: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  heroCtaBtn: {
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Metrics 2x2 Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricCard: {
    width: '48.5%',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Low Stock Card
  stockAlertCard: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  stockAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stockAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  stockAlertAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  stockPillScroll: {
    flexDirection: 'row',
  },
  stockPill: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    minWidth: 110,
  },
  stockPillName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stockPillQty: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '700',
    marginTop: 2,
  },

  // Quick Hub Section
  quickHubSection: {
    marginTop: SPACING.md,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickTile: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Recent Section
  recentSection: {
    marginTop: SPACING.md,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  invLeft: {
    flex: 1,
  },
  invHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  invCust: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  invRight: {
    alignItems: 'flex-end',
  },
  invAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  // Empty State
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
