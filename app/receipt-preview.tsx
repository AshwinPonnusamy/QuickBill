import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { pdfService } from '../services/pdf.service';
import { formatRupees } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { Invoice } from '../types';
import { Receipt, FileText, Share2, Printer, Download, Plus } from 'lucide-react-native';

export default function ReceiptPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const invoice: Invoice = params.invoiceData ? JSON.parse(params.invoiceData as string) : null;
  const [template, setTemplate] = useState<'thermal' | 'a4'>('thermal');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!invoice || !business) {
    return (
      <View style={styles.container}>
        <Header title={t.receiptTitle} showBack={true} />
        <View style={styles.centerBox}>
          <Text>Invoice data unavailable.</Text>
          <Button mode="contained" onPress={() => router.replace('/(tabs)' as any)}>
            Go to Dashboard
          </Button>
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    setIsProcessing(true);
    try {
      await pdfService.shareReceipt(invoice, business, template);
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Share failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async () => {
    setIsProcessing(true);
    try {
      await pdfService.printReceipt(invoice, business, template);
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Printing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const uri = await pdfService.createPdfFile(invoice, business, template);
      Alert.alert(t.success, `Receipt PDF saved: ${uri}`);
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Download failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.receiptTitle} showBack={false} />

      {/* Template Toggle (Thermal 80mm vs Standard A4) */}
      <View style={styles.templateBar}>
        <TouchableOpacity
          onPress={() => setTemplate('thermal')}
          style={[styles.templateBtn, template === 'thermal' && styles.activeTemplateBtn]}
        >
          <Receipt size={16} color={template === 'thermal' ? COLORS.white : COLORS.textPrimary} style={{ marginRight: 6 }} />
          <Text style={[styles.templateText, template === 'thermal' && styles.activeTemplateText]}>
            {t.printThermal}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTemplate('a4')}
          style={[styles.templateBtn, template === 'a4' && styles.activeTemplateBtn]}
        >
          <FileText size={16} color={template === 'a4' ? COLORS.white : COLORS.textPrimary} style={{ marginRight: 6 }} />
          <Text style={[styles.templateText, template === 'a4' && styles.activeTemplateText]}>
            {t.printA4}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Receipt Mock Paper Surface */}
        <Surface
          style={[
            styles.paperReceipt,
            template === 'thermal' ? styles.thermalWidth : styles.a4Width,
          ]}
          elevation={3}
        >
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptBizTitle}>{business.name}</Text>
            <Text style={styles.receiptBizAddress}>{business.address}</Text>
            <Text style={styles.receiptBizPhone}>Ph: {business.phone}</Text>
            {business.isGstRegistered && business.gstin ? (
              <Text style={styles.receiptGstin}>GSTIN: {business.gstin}</Text>
            ) : null}
          </View>

          <View style={styles.dashedLine} />

          <View style={styles.receiptMeta}>
            <Text style={styles.metaRowText}>
              <Text style={{ fontWeight: 'bold' }}>Bill No: </Text>
              {invoice.invoiceNumber}
            </Text>
            <Text style={styles.metaRowText}>
              {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {invoice.customerName ? (
            <Text style={styles.metaRowText}>
              Customer: <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            </Text>
          ) : null}

          <View style={styles.solidLine} />

          {/* Items Header */}
          <View style={styles.itemHeaderRow}>
            <Text style={[styles.colName, styles.itemHeadText]}>Item</Text>
            <Text style={[styles.colQty, styles.itemHeadText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.itemHeadText]}>Rate</Text>
            <Text style={[styles.colAmt, styles.itemHeadText]}>Total</Text>
          </View>

          {/* Items List */}
          {(invoice.items || []).map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.colName}>
                <Text style={styles.itemNameText}>{it.productName}</Text>
              </View>
              <Text style={styles.colQty}>{it.quantity}</Text>
              <Text style={styles.colPrice}>{formatRupees(it.unitPricePaise, false)}</Text>
              <Text style={styles.colAmt}>{formatRupees(it.totalPaise, false)}</Text>
            </View>
          ))}

          <View style={styles.dashedLine} />

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totRow}>
              <Text style={styles.totLabel}>Subtotal:</Text>
              <Text style={styles.totVal}>{formatRupees(invoice.subtotalPaise)}</Text>
            </View>

            {invoice.discountPaise > 0 ? (
              <View style={styles.totRow}>
                <Text style={styles.totLabel}>Discount:</Text>
                <Text style={[styles.totVal, { color: COLORS.success }]}>
                  -{formatRupees(invoice.discountPaise)}
                </Text>
              </View>
            ) : null}

            {invoice.totalTaxPaise > 0 ? (
              <>
                <View style={styles.totRow}>
                  <Text style={styles.totLabel}>CGST:</Text>
                  <Text style={styles.totVal}>{formatRupees(invoice.cgstPaise)}</Text>
                </View>
                <View style={styles.totRow}>
                  <Text style={styles.totLabel}>SGST:</Text>
                  <Text style={styles.totVal}>{formatRupees(invoice.sgstPaise)}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.solidLine} />

            <View style={styles.grandTotRow}>
              <Text style={styles.grandTotLabel}>NET TOTAL:</Text>
              <Text style={styles.grandTotVal}>{formatRupees(invoice.grandTotalPaise)}</Text>
            </View>

            <View style={styles.totRow}>
              <Text style={styles.totLabel}>Paid ({invoice.paymentMethod.toUpperCase()}):</Text>
              <Text style={styles.totVal}>{formatRupees(invoice.paidAmountPaise)}</Text>
            </View>

            {invoice.balanceAmountPaise > 0 ? (
              <View style={styles.totRow}>
                <Text style={[styles.totLabel, { color: COLORS.error, fontWeight: 'bold' }]}>
                  Balance Due:
                </Text>
                <Text style={[styles.totVal, { color: COLORS.error, fontWeight: 'bold' }]}>
                  {formatRupees(invoice.balanceAmountPaise)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.dashedLine} />

          <View style={styles.receiptFooter}>
            <Text style={styles.footerNote}>{t.thankYou}</Text>
            <Text style={styles.footerBrand}>Powered by QuickBill</Text>
          </View>
        </Surface>

        {/* Print & Share Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleShare}
            disabled={isProcessing}
          >
            <View style={styles.actionIconWrapper}>
              <Share2 size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionText}>{t.sharePdf}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={handlePrint}
            disabled={isProcessing}
          >
            <View style={styles.actionIconWrapper}>
              <Printer size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>{t.printReceipt}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleDownload}
            disabled={isProcessing}
          >
            <View style={styles.actionIconWrapper}>
              <Download size={22} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionText}>{t.downloadPdf}</Text>
          </TouchableOpacity>
        </View>

        {/* Create Next Bill Button */}
        <Button
          mode="contained"
          buttonColor={COLORS.secondary}
          textColor={COLORS.white}
          style={styles.nextBillBtn}
          contentStyle={styles.btnContent}
          icon={() => <Plus size={18} color={COLORS.white} />}
          onPress={() => router.replace('/(tabs)/new-bill' as any)}
        >
          {t.createNewBill}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  templateBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  templateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  activeTemplateBtn: {
    backgroundColor: COLORS.primaryContainer,
  },
  templateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTemplateText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
    alignItems: 'center',
  },
  paperReceipt: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.sm,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: SPACING.lg,
  },
  thermalWidth: {
    width: '100%',
    maxWidth: 320,
  },
  a4Width: {
    width: '100%',
  },
  receiptHeader: {
    alignItems: 'center',
  },
  receiptBizTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
  },
  receiptBizAddress: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  receiptBizPhone: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  receiptGstin: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    marginVertical: 8,
  },
  solidLine: {
    height: 1,
    backgroundColor: COLORS.borderStrong,
    marginVertical: 6,
  },
  receiptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaRowText: {
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  itemHeadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  colName: {
    flex: 2,
  },
  colQty: {
    flex: 0.8,
    textAlign: 'center',
    fontSize: 11,
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
  },
  colAmt: {
    flex: 1.2,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemTamilText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  totalsSection: {
    marginVertical: 4,
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  totVal: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  grandTotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  grandTotLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  grandTotVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 6,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footerBrand: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF4F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  nextBillBtn: {
    width: '100%',
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 8,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
});

