import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Button, Card, Divider, Badge } from '../../components/heroui';
import { SalesBarChart } from '../../components/common/SalesBarChart';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { billingService } from '../../services/billing.service';
import { reportService, SalesReportMetrics } from '../../services/report.service';
import { formatRupees } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { useCan } from '../../utils/permissions';
import { Invoice } from '../../types';
import {
  IndianRupee,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Tag,
  Users,
  ShieldCheck,
  ShoppingBag,
  BarChart3,
} from '../../components/common/Icons';

type ReportTab = 'overview' | 'gst' | 'items' | 'customers';

export default function ReportsScreen() {
  const language = useAuthStore((s) => s.language);
  const { business, isRoleLoaded } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      isRoleLoaded: s.isRoleLoaded,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];
  const canViewReports = canDo('view_reports');

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!business || !canViewReports) return;
    setIsRefreshing(true);
    try {
      const data = await billingService.getInvoices(business.id, {
        limit: 500,
        withItems: true,
        withPayments: true,
      });
      setInvoices(data);
    } finally {
      setIsRefreshing(false);
    }
  }, [business, canViewReports]);

  useEffect(() => {
    if (!business || !canViewReports) return;
    let cancelled = false;
    setIsRefreshing(true);
    billingService
      .getInvoices(business.id, { limit: 500, withItems: true, withPayments: true })
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business, canViewReports]);

  if (isRoleLoaded && !canViewReports) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const report: SalesReportMetrics = useMemo(() => {
    const authorized = reportService.getAuthorizedReport(invoices, period);
    return authorized.metrics || reportService.generateReport([], period);
  }, [invoices, period]);

  const reportTabs: { id: ReportTab; label: string; Icon: any }[] = [
    { id: 'overview', label: 'Overview', Icon: BarChart3 },
    { id: 'gst', label: 'GST Report', Icon: ShieldCheck },
    { id: 'items', label: 'Top Items', Icon: ShoppingBag },
    { id: 'customers', label: 'Customers', Icon: Users },
  ];

  return (
    <View style={styles.container}>
      <Header title={t.reportsTitle} showBack={false} />

      {/* Main Feature Tabs (Scrollable & Responsive Segment Bar) */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {reportTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            const IconComponent = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabPill,
                  isSelected && styles.tabPillSelected,
                ]}
              >
                <IconComponent
                  size={15}
                  color={isSelected ? COLORS.white : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    isSelected && styles.tabPillTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Period Selection Ribbon (Daily, Weekly, Monthly, All) */}
      <View style={styles.periodBar}>
        {[
          { id: 'daily', label: t.daily },
          { id: 'weekly', label: t.weekly },
          { id: 'monthly', label: t.monthly },
          { id: 'all', label: t.all },
        ].map((p) => {
          const isSelected = period === p.id;
          return (
            <Button
              key={p.id}
              variant={isSelected ? 'solid' : 'bordered'}
              color={isSelected ? 'secondary' : 'default'}
              size="sm"
              radius="md"
              style={{ flex: 1 }}
              onPress={() => setPeriod(p.id as any)}
            >
              {p.label}
            </Button>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadData} />}
      >
        {/* Core Sales Metrics Summary */}
        <View style={styles.metricsRow}>
          <StatCard
            label={t.revenue}
            value={formatRupees(report.totalRevenuePaise)}
            icon={<IndianRupee size={18} color={COLORS.primary} />}
            color={COLORS.primary}
            bgColor={COLORS.primaryContainer}
          />
          <StatCard
            label={t.totalBills}
            value={String(report.totalBills)}
            subValue={`Avg: ${formatRupees(report.averageBillValuePaise)}`}
            icon={<Receipt size={18} color={COLORS.secondary} />}
            color={COLORS.secondary}
            bgColor={COLORS.secondaryContainer}
          />
        </View>

        {/* Tab 1: Overview & Sales Breakdown */}
        {activeTab === 'overview' && (
          <>
            {/* Sales Trend Bar Chart */}
            <Card radius="xl" shadow="sm" style={styles.chartCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.chartTitle}>Revenue Trend ({period.toUpperCase()})</Text>
                <Badge color="secondary" size="sm" variant="flat">In ₹ (INR)</Badge>
              </View>
              <View style={styles.chartWrapper}>
                <SalesBarChart data={report.chartData} height={160} />
              </View>
            </Card>

            {/* Payment Methods Breakdown */}
            <Card radius="xl" shadow="sm" style={styles.breakdownCard}>
              <Text style={styles.cardHeader}>{t.paymentMethodsBreakdown}</Text>

              <View style={styles.methodBar}>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <Banknote size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.methodName}>{t.cash}</Text>
                  </View>
                  <Text style={styles.methodVal}>{formatRupees(report.cashPaymentsPaise)}</Text>
                </View>
              </View>

              <View style={styles.methodBar}>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <QrCode size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
                    <Text style={styles.methodName}>{t.upi}</Text>
                  </View>
                  <Text style={styles.methodVal}>{formatRupees(report.upiPaymentsPaise)}</Text>
                </View>
              </View>

              <View style={styles.methodBar}>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <CreditCard size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.methodName}>{t.card}</Text>
                  </View>
                  <Text style={styles.methodVal}>{formatRupees(report.cardPaymentsPaise)}</Text>
                </View>
              </View>

              <View style={[styles.methodBar, { borderBottomWidth: 0 }]}>
                <View style={styles.methodInfo}>
                  <View style={styles.methodNameRow}>
                    <BookOpen size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                    <Text style={[styles.methodName, { color: COLORS.error }]}>{t.pendingPayments}</Text>
                  </View>
                  <Text style={[styles.methodVal, { color: COLORS.error }]}>
                    {formatRupees(report.pendingUdharPaise)}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Tab 2: GST Tax Report */}
        {activeTab === 'gst' && (
          <Card radius="xl" shadow="sm" style={styles.breakdownCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>GST Summary (GSTR-1 Ready)</Text>
              <ShieldCheck size={20} color={COLORS.secondary} />
            </View>

            <View style={styles.gstHeroCard}>
              <Text style={styles.gstHeroLabel}>Total GST Collected</Text>
              <Text style={styles.gstHeroValue}>{formatRupees(report.totalGstPaise)}</Text>
              <Text style={styles.gstHeroSub}>From {report.totalBills} issued taxable invoices</Text>
            </View>

            <View style={styles.gstGrid}>
              <View style={styles.gstTile}>
                <Text style={styles.gstTileLabel}>CGST (Central Tax)</Text>
                <Text style={styles.gstTileValue}>{formatRupees(report.cgstPaise)}</Text>
              </View>
              <View style={styles.gstTile}>
                <Text style={styles.gstTileLabel}>SGST (State Tax)</Text>
                <Text style={styles.gstTileValue}>{formatRupees(report.sgstPaise)}</Text>
              </View>
            </View>

            <View style={[styles.gstTile, { marginTop: 8 }]}>
              <Text style={styles.gstTileLabel}>IGST (Integrated Interstate Tax)</Text>
              <Text style={styles.gstTileValue}>{formatRupees(report.igstPaise)}</Text>
            </View>

            <View style={styles.infoCallout}>
              <Text style={styles.infoCalloutText}>
                Shop GSTIN: {business?.gstin || 'Unregistered'} • Filing Frequency: Monthly
              </Text>
            </View>
          </Card>
        )}

        {/* Tab 3: Item Performance */}
        {activeTab === 'items' && (
          <Card radius="xl" shadow="sm" style={styles.topProdCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>Best Selling Products</Text>
              <ShoppingBag size={18} color={COLORS.primary} />
            </View>

            {report.topProducts.length === 0 ? (
              <Text style={styles.noData}>No item sales recorded in this period.</Text>
            ) : (
              report.topProducts.map((p, idx) => (
                <View key={idx} style={styles.topProdRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNum}>{idx + 1}</Text>
                  </View>
                  <View style={styles.topProdInfo}>
                    <Text style={styles.topProdName}>{p.name}</Text>
                    <Text style={styles.topProdQty}>{p.quantity} units sold</Text>
                  </View>
                  <Text style={styles.topProdRevenue}>{formatRupees(p.revenuePaise)}</Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* Tab 4: Customers & Discounts */}
        {activeTab === 'customers' && (
          <Card radius="xl" shadow="sm" style={styles.breakdownCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>Customer Billing Insights</Text>
              <Users size={18} color={COLORS.primary} />
            </View>

            <View style={styles.custStatRow}>
              <View style={styles.custStatBox}>
                <Text style={styles.custStatVal}>{report.customerBillCount}</Text>
                <Text style={styles.custStatLabel}>Named Customers</Text>
              </View>
              <View style={styles.custStatBox}>
                <Text style={styles.custStatVal}>{report.walkInBillCount}</Text>
                <Text style={styles.custStatLabel}>Walk-in Shoppers</Text>
              </View>
            </View>

            <Divider style={{ marginVertical: SPACING.md }} />

            <View style={styles.methodInfo}>
              <View style={styles.methodNameRow}>
                <Tag size={16} color={COLORS.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.methodName}>Total Discounts Granted</Text>
              </View>
              <Text style={[styles.methodVal, { color: COLORS.secondary }]}>
                {formatRupees(report.totalDiscountGivenPaise)}
              </Text>
            </View>

            <View style={[styles.methodInfo, { marginTop: 12 }]}>
              <View style={styles.methodNameRow}>
                <BookOpen size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                <Text style={[styles.methodName, { color: COLORS.error }]}>Outstanding Udhar Credit</Text>
              </View>
              <Text style={[styles.methodVal, { color: COLORS.error }]}>
                {formatRupees(report.pendingUdharPaise)}
              </Text>
            </View>
          </Card>
        )}

        {/* Profitability Disclaimer */}
        <View style={styles.disclaimerBox}>
          <AlertCircle size={16} color={COLORS.secondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.disclaimerText}>{t.profitDisclaimer}</Text>
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
  tabContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  tabScrollContent: {
    paddingHorizontal: SPACING.base,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabPillTextSelected: {
    color: COLORS.white,
  },
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chartCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  breakdownCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  methodInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  methodVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  // GST Section
  gstHeroCard: {
    backgroundColor: COLORS.primaryContainer,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  gstHeroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  gstHeroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    marginVertical: 4,
  },
  gstHeroSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  gstGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  gstTile: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gstTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  gstTileValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  infoCallout: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: ROUNDNESS.sm,
  },
  infoCalloutText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Customer Stat Box
  custStatRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  custStatBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  custStatVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  custStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Top Products
  topProdCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  topProdInfo: {
    flex: 1,
  },
  topProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  topProdQty: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  topProdRevenue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  noData: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: SPACING.lg,
  },

  // Disclaimer
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
