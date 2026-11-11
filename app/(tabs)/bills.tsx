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
import {
  Search,
  X,
  FolderOpen,
  User,
  Share2,
  Printer,
  Banknote,
  QrCode,
  CreditCard,
  BookOpen,
  Clock,
  ChevronDown,
  Filter,
} from '../../components/common/Icons';

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'void';
type ModeFilter = 'all' | 'cash' | 'upi' | 'card' | 'credit';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function BillHistoryScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
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

  const now = new Date();
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Status Filter
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'void'
        ? inv.isVoid
        : inv.paymentStatus === statusFilter && !inv.isVoid;

    // 2. Payment Mode Filter
    const matchesMode =
      modeFilter === 'all'
        ? true
        : inv.paymentMethod === modeFilter;

    // 3. Date Filter
    const invDate = new Date(inv.createdAt);
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate =
        invDate.getDate() === now.getDate() &&
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = invDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = invDate >= monthAgo;
    }

    // 4. Search Filter
    const matchesSearch =
      search.trim() === '' ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.customerPhone && inv.customerPhone.includes(search));

    return matchesStatus && matchesMode && matchesDate && matchesSearch;
  });

  // Calculate filtered totals
  const totalFilteredAmount = filteredInvoices
    .filter((i) => !i.isVoid)
    .reduce((sum, i) => sum + i.grandTotalPaise, 0);

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

  const clearAllFilters = () => {
    setStatusFilter('all');
    setModeFilter('all');
    setDateFilter('all');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || modeFilter !== 'all' || dateFilter !== 'all' || search !== '';

  return (
    <View style={styles.container}>
      <Header title={t.billHistoryTitle} showBack={false} />

      {/* Search Input Bar */}
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
          style={styles.searchInput}
        />
      </View>

      {/* Date & Mode Filters Bar */}
      <View style={styles.filterSection}>
        {/* Date Filter Row with Filter Icon */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <View style={styles.filterIconBadge}>
            <Filter size={15} color={hasActiveFilters ? COLORS.secondary : COLORS.textSecondary} />
          </View>
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
          ].map((item) => {
            const isSelected = dateFilter === item.id;
            return (
              <Button
                key={item.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                onPress={() => setDateFilter(item.id as DateFilter)}
              >
                {item.label}
              </Button>
            );
          })}
        </ScrollView>

        {/* Payment Status & Mode Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { marginTop: 6 }]}>
          {[
            { id: 'all', label: 'All Status' },
            { id: 'paid', label: 'Paid' },
            { id: 'unpaid', label: 'Unpaid / Udhar' },
            { id: 'partial', label: 'Partial' },
            { id: 'void', label: 'Cancelled' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? (tab.id === 'void' ? 'danger' : 'primary') : 'default'}
                size="sm"
                radius="md"
                onPress={() => setStatusFilter(tab.id as StatusFilter)}
              >
                {tab.label}
              </Button>
            );
          })}

          <View style={styles.verticalDivider} />

          {/* Mode Pill Badges */}
          {[
            { id: 'cash', label: 'Cash' },
            { id: 'upi', label: 'UPI' },
            { id: 'card', label: 'Card' },
            { id: 'credit', label: 'Udhar' },
          ].map((m) => {
            const isSelected = modeFilter === m.id;
            return (
              <Button
                key={m.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                onPress={() => setModeFilter(modeFilter === m.id ? 'all' : (m.id as ModeFilter))}
              >
                {m.label}
              </Button>
            );
          })}

          {hasActiveFilters ? (
            <Button
              variant="flat"
              color="danger"
              size="sm"
              radius="md"
              onPress={clearAllFilters}
            >
              Reset
            </Button>
          ) : null}
        </ScrollView>
      </View>

      {/* Filter Summary Banner */}
      <View style={styles.summaryBanner}>
        <Text style={styles.summaryCount}>
          Showing <Text style={{ fontWeight: '800', color: COLORS.primary }}>{filteredInvoices.length}</Text> bills
        </Text>
        <Text style={styles.summaryTotal}>
          Total: <Text style={{ fontWeight: '900', color: COLORS.secondary }}>{formatRupees(totalFilteredAmount)}</Text>
        </Text>
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
            <Text style={styles.emptySubtitle}>Try adjusting your search query or active filter chips.</Text>
            {hasActiveFilters ? (
              <Button color="secondary" size="sm" radius="md" style={{ marginTop: 12 }} onPress={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : null}
          </Card>
        ) : (
          filteredInvoices.map((inv) => (
            <Card
              key={inv.id}
              radius="lg"
              shadow="sm"
              style={[styles.invoiceCard, inv.isVoid && styles.voidCard]}
            >
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                    <SyncStatusBadge status={inv.syncStatus} />
                  </View>
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
                  <Text style={styles.custText} numberOfLines={1}>
                    {inv.customerName || 'Walk-in Customer'} {inv.customerPhone ? `(${inv.customerPhone})` : ''}
                  </Text>
                </View>
                <View style={styles.modeBadgeBox}>
                  <Text style={styles.methodText}>
                    {inv.paymentMethod.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/receipt-preview',
                      params: { invoiceData: JSON.stringify(inv) },
                    } as any)
                  }
                >
                  <Text style={styles.viewReceiptLink}>View Bill Receipt →</Text>
                </TouchableOpacity>

                <View style={styles.actionBtns}>
                  <TouchableOpacity onPress={() => handleShare(inv)} style={styles.iconActionBtn}>
                    <Share2 size={18} color={COLORS.secondary} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handlePrint(inv)} style={styles.iconActionBtn}>
                    <Printer size={18} color={COLORS.primary} />
                  </TouchableOpacity>

                  {!inv.isVoid ? (
                    <Button
                      variant="light"
                      color="danger"
                      size="sm"
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

      {/* Void Invoice Confirmation Modal */}
      <Modal isOpen={voidModalVisible} onClose={() => setVoidModalVisible(false)}>
        <ModalHeader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>{t.voidBill}</Text>
            <TouchableOpacity onPress={() => setVoidModalVisible(false)}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.modalNotice}>
            Cancelling this bill will mark it as VOID and reverse any stock adjustments or udhar balances.
          </Text>

          <Input
            label={t.voidReason}
            placeholder="e.g. Customer returned items / wrong entry"
            value={voidReason}
            onChangeText={setVoidReason}
            multiline
            numberOfLines={3}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" color="default" onPress={() => setVoidModalVisible(false)}>
            {t.cancel}
          </Button>
          <Button color="danger" onPress={handleConfirmVoid}>
            Confirm Cancel
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
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: 2,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterSection: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    paddingHorizontal: SPACING.base,
    gap: 6,
    alignItems: 'center',
  },
  filterIconBadge: {
    padding: 6,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
    alignSelf: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryTotal: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  invoiceCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voidCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  custText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  modeBadgeBox: {
    backgroundColor: '#EEF4F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.sm,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.xs,
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
  },
  viewReceiptLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.background,
  },
  modalNotice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
});
