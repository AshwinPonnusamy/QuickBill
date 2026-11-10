import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
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

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
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
        ].map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPeriod(p.id as any)}
            style={[styles.periodChip, period === p.id && styles.activePeriodChip]}
          >
            <Text style={[styles.periodText, period === p.id && styles.activePeriodText]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadData} />}
      >
        {/* Revenue Disclaimer Callout (Do not represent revenue as profit) */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>{t.profitDisclaimer}</Text>
        </View>

        {/* Core Sales Metrics */}
        <View style={styles.metricsRow}>
          <StatCard
            label={t.revenue}
            value={formatRupees(report.totalRevenuePaise)}
            icon="💵"
            color={COLORS.primary}
            bgColor="#EEF4F9"
          />
          <StatCard
            label={t.totalBills}
            value={String(report.totalBills)}
            subValue={`Avg: ${formatRupees(report.averageBillValuePaise)}`}
            icon="🧾"
            color={COLORS.secondary}
            bgColor="#E6F8FA"
          />
        </View>

        {/* Weekly Trend Bar Chart */}
        <Surface style={styles.chartCard} elevation={1}>
          <Text style={styles.chartTitle}>Sales Trend (Daily in ₹)</Text>
          <View style={styles.chartWrapper}>
            {report.chartData && report.chartData.length > 0 ? (
              <BarChart
                data={report.chartData}
                barWidth={24}
                spacing={16}
                roundedTop
                roundedBottom
                frontColor={COLORS.secondary}
                noOfSections={4}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 11 }}
                width={screenWidth - 90}
                height={160}
              />
            ) : (
              <Text style={styles.noData}>No chart data available for this range</Text>
            )}
          </View>
        </Surface>

        {/* Payment Methods Breakdown */}
        <Surface style={styles.breakdownCard} elevation={1}>
          <Text style={styles.cardHeader}>{t.paymentMethodsBreakdown}</Text>

          <View style={styles.methodBar}>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>💵 {t.cash}</Text>
              <Text style={styles.methodVal}>{formatRupees(report.cashPaymentsPaise)}</Text>
            </View>
          </View>

          <View style={styles.methodBar}>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>📱 {t.upi}</Text>
              <Text style={styles.methodVal}>{formatRupees(report.upiPaymentsPaise)}</Text>
            </View>
          </View>

          <View style={styles.methodBar}>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>💳 {t.card}</Text>
              <Text style={styles.methodVal}>{formatRupees(report.cardPaymentsPaise)}</Text>
            </View>
          </View>

          <View style={[styles.methodBar, { borderBottomWidth: 0 }]}>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodName, { color: COLORS.error }]}>📒 {t.pendingPayments}</Text>
              <Text style={[styles.methodVal, { color: COLORS.error }]}>
                {formatRupees(report.pendingUdharPaise)}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Top Selling Products */}
        <Surface style={styles.topProdCard} elevation={1}>
          <Text style={styles.cardHeader}>{t.topProducts}</Text>
          {report.topProducts.length === 0 ? (
            <Text style={styles.noData}>No products recorded yet.</Text>
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
        </Surface>
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
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  activePeriodChip: {
    backgroundColor: COLORS.primaryContainer,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activePeriodText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  breakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
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
  methodName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  methodVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topProdCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
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
    color: COLORS.textMuted,
  },
  topProdRevenue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  noData: {
    fontSize: 12,
    color: COLORS.textMuted,
    paddingVertical: SPACING.md,
    textAlign: 'center',
  },
});

