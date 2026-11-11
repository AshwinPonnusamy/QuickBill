import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Divider } from '../../components/heroui';
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
import { Search, X, FolderOpen, User, Share2, Printer } from '../../components/common/Icons';

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
        <Input
          placeholder={t.searchBills}
          value={search}
          onChangeText={setSearch}
          startContent={<Search size={18} color={COLORS.textSecondary} />}
          endContent={
            search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : undefined
          }
          style={styles.input}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {[
            { id: 'all', label: t.filterAll },
            { id: 'paid', label: t.filterPaid },
            { id: 'partial', label: t.filterPartial },
            { id: 'unpaid', label: t.filterUnpaid },
            { id: 'void', label: t.filterVoid },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                onPress={() => setStatusFilter(tab.id as any)}
              >
                {tab.label}
              </Button>
            );
          })}
        </ScrollView>
      </View>

      {/* Bills List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadInvoices} />}
      >
        {filteredInvoices.length === 0 ? (
          <Card radius="lg" shadow="sm" style={styles.emptyCard}>
            <FolderOpen size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
            <Text style={styles.emptyTitle}>No matching bills found</Text>
          </Card>
        ) : (
          filteredInvoices.map((inv) => (
            <Card key={inv.id} radius="lg" shadow="sm" style={[styles.invoiceCard, inv.isVoid && styles.voidCard]}>
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
                  <Badge
                    color={inv.isVoid ? 'danger' : inv.paymentStatus === 'paid' ? 'success' : 'warning'}
                    variant="flat"
                    size="sm"
                    style={{ marginTop: 4 }}
                  >
                    {inv.isVoid ? 'VOIDED' : inv.paymentStatus.toUpperCase()}
                  </Badge>
                </View>
              </View>

              <Divider style={{ marginVertical: SPACING.sm }} />

              <View style={styles.cardMidRow}>
                <View style={styles.custRow}>
                  <User size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.custText}>
                    {inv.customerName || 'Walk-in Customer'} {inv.customerPhone ? `(${inv.customerPhone})` : ''}
                  </Text>
                </View>
                <Text style={styles.methodText}>
                  Mode: <Text style={{ fontWeight: 'bold' }}>{inv.paymentMethod.toUpperCase()}</Text>
                </Text>
              </View>

              <View style={styles.cardBottomRow}>
                <SyncStatusBadge status={inv.syncStatus} />

                <View style={styles.actionBtns}>
                  <TouchableOpacity onPress={() => handleShare(inv)} style={styles.iconActionBtn}>
                    <Share2 size={18} color={COLORS.secondary} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handlePrint(inv)} style={styles.iconActionBtn}>
                    <Printer size={18} color={COLORS.primary} />
                  </TouchableOpacity>

                  {!inv.isVoid ? (
                    <Button
                      variant="bordered"
                      color="danger"
                      size="sm"
                      radius="sm"
                      onPress={() => {
                        setSelectedInvoice(inv);
                        setVoidModalVisible(true);
                      }}
                    >
                      Void
                    </Button>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Void Reason Confirmation Modal */}
      <Modal
        visible={voidModalVisible}
        onDismiss={() => setVoidModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Cancel Bill {selectedInvoice?.invoiceNumber}
          </Text>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.modalWarning}>
            Voiding an invoice marks it cancelled, restores stock quantities, and removes pending balance from customer ledger.
          </Text>
          <Input
            label={t.voidReason}
            placeholder="e.g. Customer returned items / Wrong entry"
            value={voidReason}
            onChangeText={setVoidReason}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" color="default" size="md" radius="md" onPress={() => setVoidModalVisible(false)} style={{ flex: 1 }}>
            {t.cancel}
          </Button>
          <Button
            color="danger"
            size="md"
            radius="md"
            onPress={handleConfirmVoid}
            style={{ flex: 1 }}
          >
            Confirm Void
          </Button>
        </ModalFooter>
      </Modal>
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
    marginBottom: 0,
  },
  filterBar: {
    paddingVertical: SPACING.xs,
  },
  filterScrollContent: {
    paddingHorizontal: SPACING.base,
    gap: 8,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  emptyTitle: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  invoiceCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  voidCard: {
    opacity: 0.7,
    backgroundColor: '#FEF2F2',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invNumber: {
    fontWeight: '800',
    fontSize: 15,
    color: COLORS.primary,
  },
  invDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  invTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  voidText: {
    textDecorationLine: 'line-through',
    color: COLORS.error,
  },
  cardMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  custText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    gap: SPACING.sm,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  modalContent: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  modalWarning: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
});
