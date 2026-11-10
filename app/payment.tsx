import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useBillStore } from '../store/bill.store';
import { billingService } from '../services/billing.service';
import { formatRupees, paiseToRupees, rupeesToPaise } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { PaymentMethod } from '../types';

export default function PaymentScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { customer, notes, getCalculation, clearBill } = useBillStore();
  const t = TRANSLATIONS[language];

  const calculation = getCalculation();
  const grandTotalPaise = calculation.grandTotalPaise;
  const grandTotalRupees = paiseToRupees(grandTotalPaise);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(String(grandTotalRupees));
  const [paymentReference, setPaymentReference] = useState('');
  const [splitCash, setSplitCash] = useState(String(Math.floor(grandTotalRupees / 2)));
  const [splitUpi, setSplitUpi] = useState(String(grandTotalRupees - Math.floor(grandTotalRupees / 2)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cash change calculation
  const cashReceivedPaise = rupeesToPaise(Number(cashReceived) || 0);
  const changeToReturnPaise = Math.max(0, cashReceivedPaise - grandTotalPaise);

  const handleQuickCash = (amount: number) => {
    setCashReceived(String(amount));
  };

  const handleConfirmPayment = async () => {
    if (!business) return;

    if (paymentMethod === 'credit' && !customer) {
      Alert.alert(
        t.error,
        'Cannot record Credit / Udhar for a Walk-in Customer. Please assign a named Customer first.'
      );
      return;
    }

    if (paymentMethod === 'cash' && cashReceivedPaise < grandTotalPaise) {
      Alert.alert(
        'Partial Cash Received',
        `Received ${formatRupees(cashReceivedPaise)} is less than total ${formatRupees(grandTotalPaise)}. The remainder will be recorded as pending udhar.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => processInvoice(cashReceivedPaise) },
        ]
      );
      return;
    }

    let paidPaise = grandTotalPaise;
    if (paymentMethod === 'credit') {
      paidPaise = 0;
    } else if (paymentMethod === 'cash') {
      paidPaise = Math.min(grandTotalPaise, cashReceivedPaise);
    } else if (paymentMethod === 'split') {
      const splitTotal = rupeesToPaise(Number(splitCash) || 0) + rupeesToPaise(Number(splitUpi) || 0);
      if (splitTotal !== grandTotalPaise) {
        Alert.alert(t.error, `Split amounts (${formatRupees(splitTotal)}) must equal the total ${formatRupees(grandTotalPaise)}.`);
        return;
      }
      paidPaise = splitTotal;
    }

    processInvoice(paidPaise);
  };

  const processInvoice = async (paidPaise: number) => {
    setIsSubmitting(true);
    try {
      const res = await billingService.createInvoice(
        business!.id,
        calculation,
        paymentMethod,
        paidPaise,
        customer,
        notes || undefined,
        business?.invoicePrefix || 'QB'
      );

      if (res.invoice) {
        clearBill();
        router.replace({
          pathname: '/receipt-preview',
          params: { invoiceData: JSON.stringify(res.invoice) },
        } as any);
      }
    } catch (err: any) {
      Alert.alert(t.error, err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.paymentTitle} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Payable Hero Surface */}
        <Surface style={styles.payableCard} elevation={2}>
          <Text style={styles.payableLabel}>{t.payableAmount}</Text>
          <Text style={styles.payableValue}>{formatRupees(grandTotalPaise)}</Text>
          {customer ? (
            <Text style={styles.payableCust}>
              Customer: {customer.name} {customer.outstandingBalancePaise > 0 ? `(Prior Udhar: ${formatRupees(customer.outstandingBalancePaise)})` : ''}
            </Text>
          ) : null}
        </Surface>

        {/* Method Selector Tabs */}
        <Text style={styles.sectionTitle}>{t.selectPaymentMethod}</Text>
        <View style={styles.methodRow}>
          {[
            { id: 'cash', label: '💵 ' + t.cash },
            { id: 'upi', label: '📱 ' + t.upi },
            { id: 'card', label: '💳 ' + t.card },
            { id: 'credit', label: '📒 ' + t.credit },
            { id: 'split', label: '⚖️ ' + t.split },
          ].map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setPaymentMethod(m.id as PaymentMethod)}
              style={[styles.methodTab, paymentMethod === m.id && styles.activeMethodTab]}
            >
              <Text
                style={[styles.methodTabText, paymentMethod === m.id && styles.activeMethodTabText]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic Payment Method View */}
        {paymentMethod === 'cash' ? (
          <Surface style={styles.methodCard} elevation={1}>
            <TextInput
              label={t.cashReceived}
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Affix text="₹ " />}
            />

            {/* Quick cash denomination chips */}
            <Text style={styles.quickCashLabel}>Quick Cash Tender:</Text>
            <View style={styles.chipsRow}>
              {[grandTotalRupees, 100, 200, 500, 2000].map((amt, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleQuickCash(amt)}
                  style={styles.cashChip}
                >
                  <Text style={styles.cashChipText}>
                    {amt === grandTotalRupees ? 'Exact' : `₹${amt}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Change to return callout */}
            <View style={styles.changeBanner}>
              <Text style={styles.changeLabel}>{t.changeReturn}:</Text>
              <Text style={styles.changeValue}>{formatRupees(changeToReturnPaise)}</Text>
            </View>
          </Surface>
        ) : null}

        {paymentMethod === 'upi' ? (
          <Surface style={styles.methodCard} elevation={1}>
            <View style={styles.upiQrBox}>
              <Text style={styles.upiQrIcon}>📱</Text>
              <Text style={styles.upiTitle}>Scan & Pay via any UPI App</Text>
              <Text style={styles.upiSub}>GPay • PhonePe • Paytm • BHIM</Text>
              <Text style={styles.upiAmount}>{formatRupees(grandTotalPaise)}</Text>
            </View>

            <TextInput
              label={t.paymentReference}
              placeholder="e.g. 12-digit UTR or Transaction ID"
              value={paymentReference}
              onChangeText={setPaymentReference}
              mode="outlined"
              style={styles.input}
            />
          </Surface>
        ) : null}

        {paymentMethod === 'card' ? (
          <Surface style={styles.methodCard} elevation={1}>
            <Text style={styles.cardHeader}>POS Card Swipe / Tap</Text>
            <Text style={styles.cardSub}>Swipe customer Debit/Credit card on your card terminal.</Text>
            <TextInput
              label="Card Approval / Auth Code (Optional)"
              placeholder="e.g. AUTH-9821"
              value={paymentReference}
              onChangeText={setPaymentReference}
              mode="outlined"
              style={styles.input}
            />
          </Surface>
        ) : null}

        {paymentMethod === 'credit' ? (
          <Surface style={[styles.methodCard, styles.creditCardSurface]} elevation={1}>
            <Text style={styles.creditHeader}>⚠️ Udhar / Unpaid Credit Sale</Text>
            <Text style={styles.creditNotice}>
              This invoice will be marked as UNPAID. The outstanding balance of {formatRupees(grandTotalPaise)} will be automatically added to {customer?.name || 'the customer'}'s ledger.
            </Text>
          </Surface>
        ) : null}

        {paymentMethod === 'split' ? (
          <Surface style={styles.methodCard} elevation={1}>
            <Text style={styles.splitHeader}>Split Payment (Cash + UPI)</Text>
            <TextInput
              label="Cash Amount (₹)"
              value={splitCash}
              onChangeText={setSplitCash}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="UPI Amount (₹)"
              value={splitUpi}
              onChangeText={setSplitUpi}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
          </Surface>
        ) : null}
      </ScrollView>

      {/* Settle Action Button */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="contained"
          buttonColor={paymentMethod === 'credit' ? COLORS.warning : COLORS.success}
          textColor={COLORS.white}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.confirmBtn}
          contentStyle={styles.btnContent}
          onPress={handleConfirmPayment}
        >
          {t.markPaid} ({formatRupees(grandTotalPaise)})
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
  payableCard: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  payableLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  payableValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  payableCust: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  methodTab: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  activeMethodTab: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E6F8FA',
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  activeMethodTabText: {
    color: COLORS.secondary,
  },
  methodCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  quickCashLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  cashChip: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cashChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  changeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.success,
  },
  upiQrBox: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  upiQrIcon: {
    fontSize: 36,
  },
  upiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  upiSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  upiAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.secondary,
    marginTop: 6,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  creditCardSurface: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  creditHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  creditNotice: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 6,
    lineHeight: 18,
  },
  splitHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmBtn: {
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 8,
  },
});
