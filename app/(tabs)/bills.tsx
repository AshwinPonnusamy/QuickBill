import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, ModalFooter, Badge, Divider } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { billingService } from '../../services/billing.service';
import { pdfService } from '../../services/pdf.service';
import { formatRupees } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { useCan, RoleGate } from '../../utils/permissions';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
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
  Check,
} from '../../components/common/Icons';

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'void';
type ModeFilter = 'all' | 'cash' | 'upi' | 'card' | 'credit';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const PAGE_SIZE = 50;
const INVOICE_ROW_HEIGHT = 172;

interface InvoiceRowCardProps {
  inv: Invoice;
  canVoid: boolean;
  onViewReceipt: (inv: Invoice) => void;
  onShare: (inv: Invoice) => void;
  onPrint: (inv: Invoice) => void;
  onVoidPress: (inv: Invoice) => void;
}

const InvoiceRowCard = React.memo<InvoiceRowCardProps>(
  ({ inv, canVoid, onViewReceipt, onShare, onPrint, onVoidPress }) => {
    const formattedDate = useMemo(
      () =>
        new Date(inv.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      [inv.createdAt]
    );

    return (
      <Card
        radius="lg"
        shadow="sm"
        style={[styles.invoiceCard, inv.isVoid && styles.voidCard]}
      >
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.invNumber} numberOfLines={1}>{inv.invoiceNumber}</Text>
            </View>
            <Text style={styles.invDate}>{formattedDate}</Text>
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
            <Text style={styles.methodText}>{inv.paymentMethod.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <TouchableOpacity onPress={() => onViewReceipt(inv)}>
            <Text style={styles.viewReceiptLink}>View Bill Receipt →</Text>
          </TouchableOpacity>

          <View style={styles.actionBtns}>
            <TouchableOpacity onPress={() => onShare(inv)} style={styles.iconActionBtn}>
              <Share2 size={18} color={COLORS.secondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onPrint(inv)} style={styles.iconActionBtn}>
              <Printer size={18} color={COLORS.primary} />
            </TouchableOpacity>

            {!inv.isVoid && canVoid ? (
              <Button
                variant="light"
                color="danger"
                size="sm"
                onPress={() => onVoidPress(inv)}
              >
                Void
              </Button>
            ) : null}
          </View>
        </View>
      </Card>
    );
  }
);

export default function BillHistoryScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const business = useBusinessStore((s) => s.business);
  const canDo = useCan();
  const t = TRANSLATIONS[language];
  const canViewAllInvoices = canDo('view_all_invoices');
  const canVoid = canDo('void_invoice');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempStatus, setTempStatus] = useState<StatusFilter>('all');
  const [tempMode, setTempMode] = useState<ModeFilter>('all');
  const [tempDate, setTempDate] = useState<DateFilter>('all');

  // Void Modal state
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const loadInvoices = useCallback(async () => {
    if (!business) return;
    setIsRefreshing(true);
    try {
      const data = await billingService.getInvoices(business.id, {
        limit: PAGE_SIZE,
        withItems: false,
      });
      setInvoices(data);
      setHasMore(data.length >= PAGE_SIZE);
    } finally {
      setIsRefreshing(false);
    }
  }, [business]);

  const loadMoreInvoices = useCallback(async () => {
    if (!business || !hasMore || isLoadingMore || invoices.length === 0) return;
    setIsLoadingMore(true);
    try {
      const oldestCreatedAt = invoices[invoices.length - 1].createdAt;
      const nextPage = await billingService.getInvoices(business.id, {
        limit: PAGE_SIZE,
        before: oldestCreatedAt,
        withItems: false,
      });
      if (nextPage.length === 0) {
        setHasMore(false);
      } else {
        setInvoices((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const unique = nextPage.filter((i) => !seen.has(i.id));
          return [...prev, ...unique];
        });
        setHasMore(nextPage.length >= PAGE_SIZE);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [business, hasMore, isLoadingMore, invoices]);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    setIsRefreshing(true);
    billingService
      .getInvoices(business.id, { limit: PAGE_SIZE, withItems: false })
      .then((data) => {
        if (cancelled) return;
        setInvoices(data);
        setHasMore(data.length >= PAGE_SIZE);
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business]);

  const openFilterModal = () => {
    setTempStatus(statusFilter);
    setTempMode(modeFilter);
    setTempDate(dateFilter);
    setFilterModalVisible(true);
  };

  const applyModalFilters = () => {
    setStatusFilter(tempStatus);
    setModeFilter(tempMode);
    setDateFilter(tempDate);
    setFilterModalVisible(false);
  };

  const resetModalFilters = () => {
    setTempStatus('all');
    setTempMode('all');
    setTempDate('all');
  };

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const query = debouncedSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'void'
          ? inv.isVoid
          : inv.paymentStatus === statusFilter && !inv.isVoid;
      if (!matchesStatus) return false;

      if (modeFilter !== 'all' && inv.paymentMethod !== modeFilter) return false;

      if (dateFilter !== 'all') {
        const invDate = new Date(inv.createdAt);
        if (dateFilter === 'today') {
          if (
            invDate.getDate() !== now.getDate() ||
            invDate.getMonth() !== now.getMonth() ||
            invDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (dateFilter === 'week') {
          const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (invDate.getTime() < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (invDate.getTime() < monthAgo) return false;
        }
      }

      if (!query) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        Boolean(inv.customerName && inv.customerName.toLowerCase().includes(query)) ||
        Boolean(inv.customerPhone && inv.customerPhone.includes(query))
      );
    });
  }, [invoices, statusFilter, modeFilter, dateFilter, debouncedSearch]);

  const totalFilteredAmount = useMemo(
    () =>
      filteredInvoices
        .filter((i) => !i.isVoid)
        .reduce((sum, i) => sum + i.grandTotalPaise, 0),
    [filteredInvoices]
  );

  const hydrateInvoiceWithItems = useCallback(async (inv: Invoice): Promise<Invoice> => {
    if (inv.items && inv.items.length > 0) return inv;
    const full = await billingService.getInvoiceById(inv.id);
    return full || inv;
  }, []);

  const handleViewReceipt = useCallback(
    (inv: Invoice) => {
      router.push({
        pathname: '/receipt-preview',
        params: { invoiceData: JSON.stringify(inv) },
      } as any);
    },
    [router]
  );

  const handlePrint = useCallback(
    async (inv: Invoice) => {
      if (!business) return;
      const fullInv = await hydrateInvoiceWithItems(inv);
      await pdfService.printReceipt(fullInv, business, 'thermal');
    },
    [business, hydrateInvoiceWithItems]
  );

  const handleShare = useCallback(
    async (inv: Invoice) => {
      if (!business) return;
      const fullInv = await hydrateInvoiceWithItems(inv);
      await pdfService.shareReceipt(fullInv, business, 'thermal');
    },
    [business, hydrateInvoiceWithItems]
  );

  const handleVoidPress = useCallback((inv: Invoice) => {
    setSelectedInvoice(inv);
    setVoidModalVisible(true);
  }, []);

  const renderInvoiceRow = useCallback(
    ({ item }: { item: Invoice }) => (
      <InvoiceRowCard
        inv={item}
        canVoid={canVoid}
        onViewReceipt={handleViewReceipt}
        onShare={handleShare}
        onPrint={handlePrint}
        onVoidPress={handleVoidPress}
      />
    ),
    [canVoid, handleViewReceipt, handleShare, handlePrint, handleVoidPress]
  );

  const invoiceKeyExtractor = useCallback((item: Invoice) => item.id, []);

  const invoiceGetItemLayout = useCallback(
    (_data: ArrayLike<Invoice> | null | undefined, index: number) => ({
      length: INVOICE_ROW_HEIGHT,
      offset: INVOICE_ROW_HEIGHT * index,
      index,
    }),
    []
  );

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

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (modeFilter !== 'all' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || search !== '';

  return (
    <View style={styles.container}>
      <Header
        title={canViewAllInvoices ? t.billHistoryTitle : 'My Bills'}
        subtitle={canViewAllInvoices ? undefined : 'Bills created by you'}
        showBack={false}
      />

      {/* Search Input Bar with Filter Button */}
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

        {/* Clickable Filter Trigger Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openFilterModal}
          style={[styles.filterActionBtn, activeFilterCount > 0 && styles.filterActionBtnActive]}
        >
          <Filter size={18} color={activeFilterCount > 0 ? COLORS.white : COLORS.primary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
            Filter
          </Text>
          {activeFilterCount > 0 ? (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Payment Status Tabs (Outer Bar) */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
      <FlatList
        data={filteredInvoices}
        keyExtractor={invoiceKeyExtractor}
        getItemLayout={invoiceGetItemLayout}
        renderItem={renderInvoiceRow}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews
        onEndReached={loadMoreInvoices}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadInvoices} />}
        ListEmptyComponent={
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
        }
      />

      {/* Dedicated Filter Selection Modal */}
      <Modal isOpen={filterModalVisible} onClose={() => setFilterModalVisible(false)}>
        <ModalHeader>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Filter size={18} color={COLORS.primary} />
              <Text style={styles.modalHeaderTitle}>Filter Bills</Text>
            </View>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </ModalHeader>
        <ModalBody>
          {/* 1. Date Range Option */}
          <Text style={styles.modalSectionLabel}>Date Range</Text>
          <View style={styles.modalButtonGrid}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
            ].map((d) => (
              <Button
                key={d.id}
                variant={tempDate === d.id ? 'solid' : 'bordered'}
                color={tempDate === d.id ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                style={{ flex: 1, minWidth: '45%' }}
                onPress={() => setTempDate(d.id as DateFilter)}
              >
                {d.label}
              </Button>
            ))}
          </View>

          {/* 2. Payment Status Option */}
          <Text style={[styles.modalSectionLabel, { marginTop: SPACING.md }]}>Payment Status</Text>
          <View style={styles.modalButtonGrid}>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'paid', label: 'Paid' },
              { id: 'unpaid', label: 'Unpaid / Udhar' },
              { id: 'partial', label: 'Partial' },
              { id: 'void', label: 'Cancelled' },
            ].map((s) => (
              <Button
                key={s.id}
                variant={tempStatus === s.id ? 'solid' : 'bordered'}
                color={tempStatus === s.id ? (s.id === 'void' ? 'danger' : 'primary') : 'default'}
                size="sm"
                radius="md"
                style={{ flex: 1, minWidth: '45%' }}
                onPress={() => setTempStatus(s.id as StatusFilter)}
              >
                {s.label}
              </Button>
            ))}
          </View>

          {/* 3. Payment Mode Option */}
          <Text style={[styles.modalSectionLabel, { marginTop: SPACING.md }]}>Payment Method</Text>
          <View style={styles.modalButtonGrid}>
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'cash', label: 'Cash' },
              { id: 'upi', label: 'UPI' },
              { id: 'card', label: 'Card' },
              { id: 'credit', label: 'Udhar' },
            ].map((m) => (
              <Button
                key={m.id}
                variant={tempMode === m.id ? 'solid' : 'bordered'}
                color={tempMode === m.id ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                style={{ flex: 1, minWidth: '45%' }}
                onPress={() => setTempMode(m.id as ModeFilter)}
              >
                {m.label}
              </Button>
            ))}
          </View>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" color="danger" onPress={resetModalFilters}>
            Reset
          </Button>
          <Button color="secondary" onPress={applyModalFilters}>
            Apply Filters
          </Button>
        </ModalFooter>
      </Modal>

      {/* Void Invoice Confirmation Modal (owner/admin only) */}
      <RoleGate permission="void_invoice">
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
      </RoleGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  filterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.primaryContainer,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    gap: 6,
  },
  filterActionBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterBtnTextActive: {
    color: COLORS.white,
  },
  filterCountBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.white,
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
    backgroundColor: COLORS.surfaceVariant,
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
    minHeight: INVOICE_ROW_HEIGHT - SPACING.sm,
  },
  voidCard: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
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
    backgroundColor: COLORS.primaryContainer,
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
    borderTopColor: COLORS.border,
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

  // Modal styles
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
