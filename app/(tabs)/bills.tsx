import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text, TextInput, Surface, Modal, Portal, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { SyncStatusBadge } from '../../components/common/SyncStatusBadge';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { billingService } from '../../services/billing.service';
import { pdfService } from '../../services/pdf.service';
import { formatRupees } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { Invoice } from '../../types';

export default function BillHistoryScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'void'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Void Modal state
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const loadInvoices = async () => {
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
    loadInvoices();
  }, [business]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'void' 
        ? inv.isVoid 
        : inv.paymentStatus === statusFilter && !inv.isVoid;

    const matchesSearch = search.trim() === '' ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.customerPhone && inv.customerPhone.includes(search));

    return matchesStatus && matchesSearch;
  });

  const handlePrint = async (inv: Invoice) => {
    if (!business) return;
    await pdfService.printReceipt(inv, business, 'thermal');
  };

  const handleShare = async (inv: Invoice) => {
    if (!business) return;
    await pdfService.shareReceipt(inv, business, 'thermal');
  };

  const handleConfirmVoid = async () => {
    if (!selectedInvoice) return;
    if (!voidReason.trim()) {
      Alert.alert(t.error, 'Please enter a reason for cancelling this bill.');
      return;
    }

    const res = await billingService.voidInvoice(selectedInvoice.id, voidReason.trim());
    if (res.success) {
      Alert.alert(t.success, `Invoice ${selectedInvoice.invoiceNumber} has been cancelled.`);
      setVoidModalVisible(false);
      setVoidReason('');
      loadInvoices();
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t.billHistoryTitle} showBack={false} />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <TextInput
          placeholder={t.searchBills}
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.secondary}
          style={styles.input}
          left={<TextInput.Icon icon={() => <Text>🔍</Text>} />}
          right={
            search ? (
              <TextInput.Icon icon={() => <Text>✕</Text>} onPress={() => setSearch('')} />
            ) : null
          }
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'all', label: t.filterAll },
            { id: 'paid', label: t.filterPaid },
            { id: 'partial', label: t.filterPartial },
            { id: 'unpaid', label: t.filterUnpaid },
            { id: 'void', label: t.filterVoid },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setStatusFilter(tab.id as any)}
              style={[styles.filterChip, statusFilter === tab.id && styles.activeFilterChip]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === tab.id && styles.activeFilterChipText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bills List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadInvoices} />}
      >
        {filteredInvoices.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No matching bills found</Text>
          </Surface>
        ) : (
          filteredInvoices.map((inv) => (
            <Surface key={inv.id} style={[styles.invoiceCard, inv.isVoid && styles.voidCard]} elevation={1}>
              <View style={styles.cardTopRow}>
                <View>
                  <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invDate}>
                    {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.invTotal, inv.isVoid && styles.voidText]}>
                    {formatRupees(inv.grandTotalPaise)}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      inv.isVoid
                        ? styles.voidPill
                        : inv.paymentStatus === 'paid'
                          ? styles.paidPill
                          : styles.unpaidPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        inv.isVoid
                          ? styles.voidPillText
                          : inv.paymentStatus === 'paid'
                            ? styles.paidPillText
                            : styles.unpaidPillText,
                      ]}
                    >
                      {inv.isVoid ? 'VOIDED' : inv.paymentStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardMidRow}>
                <Text style={styles.custText}>
                  👤 {inv.customerName || 'Walk-in Customer'} {inv.customerPhone ? `(${inv.customerPhone})` : ''}
                </Text>
                <Text style={styles.methodText}>
                  Mode: <Text style={{ fontWeight: 'bold' }}>{inv.paymentMethod.toUpperCase()}</Text>
                </Text>
              </View>

              <View style={styles.cardBottomRow}>
                <SyncStatusBadge status={inv.syncStatus} />

                <View style={styles.actionBtns}>
                  <TouchableOpacity onPress={() => handleShare(inv)} style={styles.iconActionBtn}>
                    <Text style={styles.actionIcon}>📲</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handlePrint(inv)} style={styles.iconActionBtn}>
                    <Text style={styles.actionIcon}>🖨️</Text>
                  </TouchableOpacity>

                  {!inv.isVoid ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedInvoice(inv);
                        setVoidModalVisible(true);
                      }}
                      style={styles.voidBtn}
                    >
                      <Text style={styles.voidBtnText}>Void</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </Surface>
          ))
        )}
      </ScrollView>

      {/* Void Reason Confirmation Modal */}
      <Portal>
        <Modal
          visible={voidModalVisible}
          onDismiss={() => setVoidModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Cancel Bill {selectedInvoice?.invoiceNumber}
          </Text>
          <Text style={styles.modalWarning}>
            Voiding an invoice marks it cancelled, restores stock quantities, and removes pending balance from customer ledger.
          </Text>
          <TextInput
            label={t.voidReason}
            placeholder="e.g. Customer returned items / Wrong entry"
            value={voidReason}
            onChangeText={setVoidReason}
            mode="outlined"
            style={styles.modalInput}
          />
          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setVoidModalVisible(false)} style={{ flex: 1 }}>
              {t.cancel}
            </Button>
            <Button
              mode="contained"
              buttonColor={COLORS.error}
              textColor={COLORS.white}
              onPress={handleConfirmVoid}
              style={{ flex: 1 }}
            >
              Confirm Void
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
  },
  input: {
    height: 44,
    backgroundColor: COLORS.surface,
  },
  filterBar: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeFilterChipText: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voidCard: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  invDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  invTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  voidText: {
    textDecorationLine: 'line-through',
    color: COLORS.error,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDNESS.full,
    marginTop: 2,
  },
  paidPill: {
    backgroundColor: COLORS.successLight,
  },
  unpaidPill: {
    backgroundColor: COLORS.warningLight,
  },
  voidPill: {
    backgroundColor: COLORS.errorLight,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paidPillText: {
    color: COLORS.success,
  },
  unpaidPillText: {
    color: COLORS.warning,
  },
  voidPillText: {
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  cardMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  custText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  methodText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  actionIcon: {
    fontSize: 16,
  },
  voidBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: ROUNDNESS.sm,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    backgroundColor: COLORS.errorLight,
  },
  voidBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: ROUNDNESS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    margin: SPACING.lg,
    borderRadius: ROUNDNESS.xl,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  modalWarning: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  modalInput: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});

