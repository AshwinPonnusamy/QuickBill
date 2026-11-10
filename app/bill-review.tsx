import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useBillStore } from '../store/bill.store';
import { formatRupees, getCurrentFinancialYear } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';

export default function BillReviewScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { customer, getCalculation } = useBillStore();
  const t = TRANSLATIONS[language];

  const calculation = getCalculation();
  const fy = getCurrentFinancialYear();

  return (
    <View style={styles.container}>
      <Header title={t.billReviewTitle} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Business & Invoice Header Card */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.bizName}>{business?.name || 'QuickBill Store'}</Text>
          <Text style={styles.bizAddress}>{business?.address}</Text>
          <Text style={styles.bizPhone}>Phone: {business?.phone}</Text>
          {business?.isGstRegistered && business.gstin ? (
            <Text style={styles.gstText}>GSTIN: {business.gstin}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.metaLabel}>Draft Reference:</Text>
              <Text style={styles.metaVal}>{business?.invoicePrefix || 'QB'}-{fy.replace('-', '').slice(2)}-NEW</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaVal}>{new Date().toLocaleDateString('en-IN')}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={[styles.rowBetween, { marginTop: SPACING.sm }]}>
            <View>
              <Text style={styles.metaLabel}>Customer:</Text>
              <Text style={styles.metaVal}>{customer?.name || t.walkInCustomer}</Text>
            </View>
            {customer?.phone ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metaLabel}>Phone:</Text>
                <Text style={styles.metaVal}>{customer.phone}</Text>
              </View>
            ) : null}
          </View>
        </Surface>

        {/* Itemized Table */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Itemized Products ({calculation.items.length})</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, styles.tableHeadText]}>Item</Text>
            <Text style={[styles.colQty, styles.tableHeadText]}>Qty</Text>
            <Text style={[styles.colRate, styles.tableHeadText]}>Rate</Text>
            <Text style={[styles.colTotal, styles.tableHeadText]}>Total</Text>
          </View>

          {calculation.items.map((it, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colItem}>
                <Text style={styles.itemName}>{it.cartItem.name}</Text>
                {it.cartItem.taxRate > 0 ? (
                  <Text style={styles.taxSub}>GST {it.cartItem.taxRate}%</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>{it.quantity} {it.cartItem.unit}</Text>
              <Text style={styles.colRate}>{formatRupees(it.unitPricePaise, false)}</Text>
              <Text style={styles.colTotal}>{formatRupees(it.totalPaise, false)}</Text>
            </View>
          ))}
        </Surface>

        {/* Financial & GST Breakdown Card */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Bill Breakdown</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.subtotal}:</Text>
            <Text style={styles.summaryVal}>{formatRupees(calculation.subtotalPaise)}</Text>
          </View>

          {calculation.discountPaise > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>{t.discount}:</Text>
              <Text style={[styles.summaryVal, { color: COLORS.success }]}>
                -{formatRupees(calculation.discountPaise)}
              </Text>
            </View>
          ) : null}

          {/* GST breakdown */}
          {calculation.totalTaxPaise > 0 ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST:</Text>
                <Text style={styles.summaryVal}>{formatRupees(calculation.cgstPaise)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST:</Text>
                <Text style={styles.summaryVal}>{formatRupees(calculation.sgstPaise)}</Text>
              </View>
              {calculation.igstPaise > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>IGST:</Text>
                  <Text style={styles.summaryVal}>{formatRupees(calculation.igstPaise)}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {calculation.roundOffPaise !== 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Round off:</Text>
              <Text style={styles.summaryVal}>{formatRupees(calculation.roundOffPaise)}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>{t.grandTotal}:</Text>
            <Text style={styles.grandTotalVal}>{formatRupees(calculation.grandTotalPaise)}</Text>
          </View>
        </Surface>
      </ScrollView>

      {/* Action Bar */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="outlined"
          textColor={COLORS.primary}
          style={styles.editBtn}
          onPress={() => router.back()}
        >
          {t.editBill}
        </Button>

        <Button
          mode="contained"
          buttonColor={COLORS.secondary}
          textColor={COLORS.white}
          style={styles.payBtn}
          contentStyle={styles.btnContent}
          onPress={() => router.push('/payment' as any)}
        >
          {t.proceedToPayment} →
        </Button>
      </Surface>
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
    paddingBottom: 110,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bizName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bizAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bizPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  gstText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  colItem: {
    flex: 2,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  colRate: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  colTotal: {
    flex: 1.2,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemTamil: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  taxSub: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  grandTotalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editBtn: {
    flex: 1,
    borderRadius: ROUNDNESS.md,
    borderColor: COLORS.primary,
  },
  payBtn: {
    flex: 2,
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 6,
  },
});

