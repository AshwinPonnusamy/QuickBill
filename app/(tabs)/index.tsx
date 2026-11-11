import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Text } from 'react-native';
import { Card, Button, Badge } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { StatCard } from '../../components/common/StatCard';
import { SyncStatusBadge } from '../../components/common/SyncStatusBadge';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { billingService } from '../../services/billing.service';
import { productService } from '../../services/product.service';
import { reportService } from '../../services/report.service';
import { formatRupees } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
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
  ArrowUpDown,
  TrendingUp,
  ArrowRight,
} from '../../components/common/Icons';

// Pre-seeded retail inventory for zero-setup instant demo
const DEFAULT_SAMPLE_PRODUCTS = [
  { name: 'Tea / Chai', sellingPricePaise: 1500, unit: 'cup' as const, taxRate: 5, stockQuantity: 200, lowStockThreshold: 20, isFavourite: true, isActive: true },
  { name: 'Filter Coffee', sellingPricePaise: 2500, unit: 'cup' as const, taxRate: 5, stockQuantity: 150, lowStockThreshold: 15, isFavourite: true, isActive: true },
  { name: 'Full Cream Milk (500ml)', sellingPricePaise: 3200, unit: 'packet' as const, taxRate: 0, stockQuantity: 40, lowStockThreshold: 10, isFavourite: true, isActive: true },
  { name: 'Ponni Boiled Rice (1kg)', sellingPricePaise: 6500, unit: 'kg' as const, taxRate: 0, stockQuantity: 8, lowStockThreshold: 15, isFavourite: true, isActive: true }, // Low stock!
  { name: 'Refined Sunflower Oil (1L)', sellingPricePaise: 13500, unit: 'packet' as const, taxRate: 5, stockQuantity: 25, lowStockThreshold: 5, isFavourite: false, isActive: true },
  { name: 'Marie Gold Biscuits', sellingPricePaise: 1000, unit: 'packet' as const, taxRate: 18, stockQuantity: 50, lowStockThreshold: 10, isFavourite: true, isActive: true },
  { name: 'Wheat Bread (400g)', sellingPricePaise: 4000, unit: 'packet' as const, taxRate: 0, stockQuantity: 4, lowStockThreshold: 8, isFavourite: false, isActive: true }, // Low stock!
];

export default function HomeDashboard() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { products, setProducts } = useProductStore();
  const t = TRANSLATIONS[language];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!business) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch Invoices
      const invs = await billingService.getInvoices(business.id);
      setInvoices(invs);

      // 2. Fetch Products
      let prods = await productService.getProducts(business.id);
      if (prods.length === 0) {
        // Pre-seed default products for immediate utility
        for (const sample of DEFAULT_SAMPLE_PRODUCTS) {
          await productService.saveProduct(business.id, {
            ...sample,
            id: `seed-${Date.now()}-${Math.random()}`,
            isTaxInclusive: true,
          });
        }
        prods = await productService.getProducts(business.id);
      }
      setProducts(prods);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [business]);

  // Compute metrics
  const report = reportService.generateReport(invoices, 'weekly');
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);

  // Recent 5 transactions
  const recentInvoices = invoices.slice(0, 5);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadDashboardData} />}
      >
        {/* Welcome & Main Action Hero */}
        <Card radius="xl" shadow="md" style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroGreeting}>
                Welcome, {business?.ownerName || 'Merchant'}
              </Text>
              <Text style={styles.heroSub}>
                {business?.name} • {business?.isGstRegistered ? 'GSTIN Active' : 'Regular Billing'}
              </Text>
            </View>
          </View>

          {/* Prominent NEW BILL Action */}
          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            startContent={<Zap size={20} color={COLORS.white} />}
            onPress={() => router.push('/(tabs)/new-bill' as any)}
          >
            {t.newBill} (3-TAP BILLING)
          </Button>
        </Card>

        {/* Financial Stat Cards Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label={t.todaySales}
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

        <View style={styles.statsGrid}>
          <StatCard
            label={t.paidAmount}
            value={formatRupees(report.cashPaymentsPaise + report.upiPaymentsPaise + report.cardPaymentsPaise)}
            icon={<CheckCircle2 size={18} color={COLORS.success} />}
            color={COLORS.success}
            bgColor={COLORS.successLight}
          />
          <StatCard
            label={t.pendingPayments}
            value={formatRupees(report.pendingUdharPaise)}
            icon={<AlertCircle size={18} color={COLORS.error} />}
            color={COLORS.error}
            bgColor={COLORS.errorLight}
          />
        </View>

        {/* Low Stock Alerts */}
        {lowStockProducts.length > 0 ? (
          <Card radius="lg" shadow="sm" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={18} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.alertTitle}>
                {t.lowStockAlerts} ({lowStockProducts.length})
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/products' as any)}>
                <Text style={styles.alertLink}>Manage Stock →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertScroll}>
              {lowStockProducts.map((p) => (
                <View key={p.id} style={styles.stockAlertCard}>
                  <Text style={styles.stockCardName}>{p.name}</Text>
                  <Text style={styles.stockCardCount}>
                    Only {p.stockQuantity} {p.unit} left
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Card>
        ) : null}

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>{t.quickActions}</Text>
          <View style={styles.quickGrid}>
            <Card
              isPressable
              radius="lg"
              shadow="sm"
              onPress={() => router.push('/(tabs)/products' as any)}
              style={styles.quickTile}
            >
              <View style={styles.quickIconWrapper}>
                <PackagePlus size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickLabel}>{t.addProduct}</Text>
            </Card>

            <Card
              isPressable
              radius="lg"
              shadow="sm"
              onPress={() => router.push('/customers' as any)}
              style={styles.quickTile}
            >
              <View style={styles.quickIconWrapper}>
                <Users size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickLabel}>{t.addCustomer}</Text>
            </Card>

            <Card
              isPressable
              radius="lg"
              shadow="sm"
              onPress={() => router.push('/inventory' as any)}
              style={styles.quickTile}
            >
              <View style={styles.quickIconWrapper}>
                <ArrowUpDown size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickLabel}>Stock In / Out</Text>
            </Card>

            <Card
              isPressable
              radius="lg"
              shadow="sm"
              onPress={() => router.push('/(tabs)/reports' as any)}
              style={styles.quickTile}
            >
              <View style={styles.quickIconWrapper}>
                <TrendingUp size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickLabel}>{t.viewReports}</Text>
            </Card>
          </View>
        </View>

        {/* Recent Transactions List */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>{t.recentTransactions}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bills' as any)} style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
              <ArrowRight size={14} color={COLORS.secondary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {recentInvoices.length === 0 ? (
            <Card radius="lg" shadow="sm" style={styles.emptyCard}>
              <Receipt size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.emptyTitle}>No bills created yet</Text>
              <Text style={styles.emptySubtitle}>Tap NEW BILL above to generate your first invoice.</Text>
            </Card>
          ) : (
            recentInvoices.map((inv) => (
              <Card
                key={inv.id}
                isPressable
                onPress={() => router.push('/(tabs)/bills' as any)}
                radius="md"
                shadow="sm"
                style={styles.invoiceRow}
              >
                <View style={styles.invLeft}>
                  <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invCust}>
                    {inv.customerName || 'Walk-in'} • {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <SyncStatusBadge status={inv.syncStatus} />
                </View>
                <View style={styles.invRight}>
                  <Text style={styles.invAmount}>{formatRupees(inv.grandTotalPaise)}</Text>
                  <Badge
                    color={inv.paymentMethod === 'credit' ? 'danger' : 'default'}
                    variant="flat"
                    size="sm"
                    style={{ marginTop: 4 }}
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
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroRow: {
    marginBottom: SPACING.base,
  },
  heroGreeting: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 20,
  },
  heroSub: {
    color: '#94A3B8',
    marginTop: 2,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginVertical: SPACING.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  alertTitle: {
    flex: 1,
    fontWeight: '700',
    color: '#92400E',
    fontSize: 13,
  },
  alertLink: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  alertScroll: {
    flexDirection: 'row',
  },
  stockAlertCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stockCardName: {
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  stockCardCount: {
    color: COLORS.error,
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  quickTile: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF4F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  recentSection: {
    marginTop: SPACING.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  invLeft: {
    flex: 1,
    gap: 4,
  },
  invNumber: {
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 14,
  },
  invCust: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  invRight: {
    alignItems: 'flex-end',
  },
  invAmount: {
    fontWeight: '800',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
