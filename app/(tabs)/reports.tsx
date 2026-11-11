import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, Text } from 'react-native';
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
} from '../../components/common/Icons';

type ReportTab = 'overview' | 'gst' | 'items' | 'customers';

export default function ReportsScreen() {
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!business) return;
    setIsRefreshing(true);
    try {
      const data = await billingService.getInvoices(business.id);
      setInvoices(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business]);

  const report: SalesReportMetrics = reportService.generateReport(invoices, period);

  return (
    <View style={styles.container}>
      <Header title={t.reportsTitle} showBack={false} />

      {/* Period Selection Ribbon */}
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

      {/* Report Module Tabs */}
      <View style={styles.tabNavBar}>
        {[
          { id: 'overview', label: 'Sales & Modes' },
          { id: 'gst', label: 'GST Tax Report' },
          { id: 'items', label: 'Item Performance' },
          { id: 'customers', label: 'Customers & Udhar' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isSelected ? 'solid' : 'light'}
              color={isSelected ? 'primary' : 'default'}
              size="sm"
              radius="md"
              onPress={() => setActiveTab(tab.id as ReportTab)}
            >
              {tab.label}
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
            bgColor="#EEF4F9"
          />
          <StatCard
            label={t.totalBills}
            value={String(report.totalBills)}
            subValue={`Avg: ${formatRupees(report.averageBillValuePaise)}`}
            icon={<Receipt size={18} color={COLORS.secondary} />}
            color={COLORS.secondary}
            bgColor="#E6F8FA"
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
                💡 Shop GSTIN: {business?.gstin || 'Unregistered'} • Filing Frequency: Monthly
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
  periodBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  tabNavBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
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
    backgroundColor: '#EEF4F9',
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#D0E0EC',
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
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
    borderBottomColor: '#F1F5F9',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF4F9',
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
    backgroundColor: '#F1F5F9',
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
