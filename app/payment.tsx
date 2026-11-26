import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Input, Switch } from '../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useBillStore } from '../store/bill.store';
import { useProductStore } from '../store/product.store';
import { billingService } from '../services/billing.service';
import { formatRupees, paiseToRupees, rupeesToPaise } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { PaymentMethod } from '../types';
import { Banknote, QrCode, CreditCard, BookOpen, Split, AlertTriangle, MessageSquare } from '../components/common/Icons';

export default function PaymentScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const business = useBusinessStore((s) => s.business);
  const { customer, notes, getCalculation, clearBill } = useBillStore(
    useShallow((s) => ({
      customer: s.customer,
      notes: s.notes,
      getCalculation: s.getCalculation,
      clearBill: s.clearBill,
    }))
  );
  const adjustStock = useProductStore((s) => s.adjustStock);
  const t = TRANSLATIONS[language];

  const calculation = getCalculation();
  const grandTotalPaise = calculation.grandTotalPaise;
  const grandTotalRupees = paiseToRupees(grandTotalPaise);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(String(grandTotalRupees));
  const [paymentReference, setPaymentReference] = useState('');
  const [splitCash, setSplitCash] = useState(String(Math.floor(grandTotalRupees / 2)));
  const [splitUpi, setSplitUpi] = useState(String(grandTotalRupees - Math.floor(grandTotalRupees / 2)));
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);
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
      const splitBreakdown =
        paymentMethod === 'split'
          ? {
              cashPaise: rupeesToPaise(Number(splitCash) || 0),
              upiPaise: rupeesToPaise(Number(splitUpi) || 0),
            }
          : undefined;

      const res = await billingService.createInvoice(
        business!.id,
        calculation,
        paymentMethod,
        paidPaise,
        customer,
        notes || undefined,
        business?.invoicePrefix || 'QB',
        splitBreakdown
      );

      if (res.error || !res.invoice) {
        Alert.alert(t.error, res.error || 'Payment failed');
        return;
      }

      for (const item of calculation.items) {
        if (item.cartItem.productId) {
          adjustStock(item.cartItem.productId, -item.quantity);
        }
      }

      clearBill();
      router.replace({
        pathname: '/receipt-preview',
        params: {
          invoiceData: JSON.stringify(res.invoice),
          autoShare: autoSendWhatsApp ? '1' : '0',
        },
      } as any);
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
        <Card radius="xl" shadow="md" style={styles.payableCard}>
          <Text style={styles.payableLabel}>{t.payableAmount}</Text>
          <Text style={styles.payableValue}>{formatRupees(grandTotalPaise)}</Text>
          {customer ? (
            <Text style={styles.payableCust}>
              Customer: {customer.name} {customer.outstandingBalancePaise > 0 ? `(Prior Udhar: ${formatRupees(customer.outstandingBalancePaise)})` : ''}
            </Text>
          ) : null}
        </Card>

        {/* Method Selector Tabs */}
        <Text style={styles.sectionTitle}>{t.selectPaymentMethod}</Text>
        <View style={styles.methodRow}>
          {[
            { id: 'cash', label: t.cash, Icon: Banknote },
            { id: 'upi', label: t.upi, Icon: QrCode },
            { id: 'card', label: t.card, Icon: CreditCard },
            { id: 'credit', label: t.credit, Icon: BookOpen },
            { id: 'split', label: t.split, Icon: Split },
          ].map((m) => {
            const isSelected = paymentMethod === m.id;
            const IconComponent = m.Icon;
            return (
              <Button
                key={m.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="md"
                radius="md"
                startContent={
                  <IconComponent
                    size={16}
                    color={isSelected ? COLORS.white : COLORS.textSecondary}
                  />
                }
                style={styles.methodBtn}
                onPress={() => setPaymentMethod(m.id as PaymentMethod)}
              >
                {m.label}
              </Button>
            );
          })}
        </View>

        {/* Dynamic Payment Method View */}
        {paymentMethod === 'cash' ? (
          <Card radius="lg" shadow="sm" style={styles.methodCard}>
            <Input
              label={t.cashReceived}
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="numeric"
              startContent={<Text style={{ color: COLORS.textSecondary, fontWeight: 'bold' }}>₹</Text>}
            />

            {/* Quick cash denomination buttons */}
            <Text style={styles.quickCashLabel}>Quick Cash Tender:</Text>
            <View style={styles.tenderButtonsRow}>
              {[grandTotalRupees, 100, 200, 500, 2000].map((amt, idx) => (
                <Button
                  key={idx}
                  variant="flat"
                  color="default"
                  size="sm"
                  radius="md"
                  onPress={() => handleQuickCash(amt)}
                >
                  {amt === grandTotalRupees ? 'Exact' : `₹${amt}`}
                </Button>
              ))}
            </View>

            {/* Change to return callout */}
            <View style={styles.changeBanner}>
              <Text style={styles.changeLabel}>{t.changeReturn}:</Text>
              <Text style={styles.changeValue}>{formatRupees(changeToReturnPaise)}</Text>
            </View>
          </Card>
        ) : null}

        {paymentMethod === 'upi' ? (
          <Card radius="lg" shadow="sm" style={styles.methodCard}>
            <View style={styles.upiQrBox}>
              <View style={styles.upiQrWrapper}>
                <QrCode size={48} color={COLORS.secondary} />
              </View>
              <Text style={styles.upiTitle}>Scan & Pay via any UPI App</Text>
              <Text style={styles.upiSub}>GPay • PhonePe • Paytm • BHIM</Text>
              <Text style={styles.upiAmount}>{formatRupees(grandTotalPaise)}</Text>
            </View>

            <Input
              label={t.paymentReference}
              placeholder="e.g. 12-digit UTR or Transaction ID"
              value={paymentReference}
              onChangeText={setPaymentReference}
            />
          </Card>
        ) : null}

        {paymentMethod === 'card' ? (
          <Card radius="lg" shadow="sm" style={styles.methodCard}>
            <Text style={styles.cardHeader}>POS Card Swipe / Tap</Text>
            <Text style={styles.cardSub}>Swipe customer Debit/Credit card on your card terminal.</Text>
            <Input
              label="Card Approval / Auth Code (Optional)"
              placeholder="e.g. AUTH-9821"
              value={paymentReference}
              onChangeText={setPaymentReference}
            />
          </Card>
        ) : null}

        {paymentMethod === 'credit' ? (
          <Card radius="lg" shadow="sm" style={[styles.methodCard, styles.creditCardSurface]}>
            <View style={styles.creditHeaderRow}>
              <AlertTriangle size={18} color={COLORS.error} style={{ marginRight: 6 }} />
              <Text style={styles.creditHeader}>Udhar / Unpaid Credit Sale</Text>
            </View>
            <Text style={styles.creditNotice}>
              This invoice will be marked as UNPAID. The outstanding balance of {formatRupees(grandTotalPaise)} will be automatically added to {customer?.name || 'the customer'}&apos;s ledger.
            </Text>
          </Card>
        ) : null}

        {paymentMethod === 'split' ? (
          <Card radius="lg" shadow="sm" style={styles.methodCard}>
            <Text style={styles.splitHeader}>Split Payment (Cash + UPI)</Text>
            <Input
              label="Cash Amount (₹)"
              value={splitCash}
              onChangeText={setSplitCash}
              keyboardType="numeric"
            />
            <Input
              label="UPI Amount (₹)"
              value={splitUpi}
              onChangeText={setSplitUpi}
              keyboardType="numeric"
            />
          </Card>
        ) : null}

        {/* WhatsApp Auto-share toggle card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAutoSendWhatsApp((prev) => !prev)}
        >
          <Card radius="lg" shadow="sm" style={styles.whatsappCard}>
            <View style={styles.whatsappLeft}>
              <View style={styles.whatsappIconCircle}>
                <MessageSquare size={18} color={COLORS.success} />
              </View>
              <View style={styles.whatsappInfo}>
                <Text style={styles.whatsappTitle}>{t.autoSendWhatsApp}</Text>
                <Text style={styles.whatsappDesc}>{t.autoSendWhatsAppSub}</Text>
              </View>
            </View>
            <Switch
              color="success"
              value={autoSendWhatsApp}
              onValueChange={setAutoSendWhatsApp}
            />
          </Card>
        </TouchableOpacity>
      </ScrollView>

      {/* Settle Action Button */}
      <Card radius="none" shadow="lg" style={styles.bottomBar}>
        <Button
          color={paymentMethod === 'credit' ? 'warning' : 'success'}
          size="lg"
          radius="md"
          fullWidth
          isLoading={isSubmitting}
          onPress={handleConfirmPayment}
        >
          {t.markPaid} ({formatRupees(grandTotalPaise)})
        </Button>
      </Card>
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
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  payableLabel: {
    color: COLORS.textMuted,
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
    color: COLORS.borderStrong,
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
  methodBtn: {
    flex: 1,
    minWidth: '45%',
  },
  methodCard: {
    padding: SPACING.base,
  },
  quickCashLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  tenderButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
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
  upiQrWrapper: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  creditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningBorder,
  },
  creditHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.onSecondaryContainer,
  },
  creditNotice: {
    fontSize: 12,
    color: COLORS.onSecondaryContainer,
    marginTop: 6,
    lineHeight: 18,
  },
  splitHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
  },
  whatsappLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  whatsappIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  whatsappInfo: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  whatsappDesc: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
    lineHeight: 15,
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
});
