import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Divider } from '../components/heroui';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { billingService } from '../services/billing.service';
import { formatRupees } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { useCan } from '../utils/permissions';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { Customer } from '../types';
import { Search, Plus, Users, Phone, MapPin } from '../components/common/Icons';

interface CustomerRowCardProps {
  customer: Customer;
  onSettlePress: (customer: Customer) => void;
}

const CustomerRowCard = React.memo<CustomerRowCardProps>(function CustomerRowCard({
  customer: c,
  onSettlePress,
}) {
  return (
    <Card radius="lg" shadow="sm" style={styles.custCard}>
      <View style={styles.custTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.custName} numberOfLines={1}>{c.name}</Text>
          <View style={styles.custDetailRow}>
            <Phone size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.custPhone}>{c.phone || 'No phone recorded'}</Text>
          </View>
          {c.address ? (
            <View style={styles.custDetailRow}>
              <MapPin size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.custAddress} numberOfLines={1}>{c.address}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Udhar Balance</Text>
          <Text
            style={[
              styles.balanceVal,
              c.outstandingBalancePaise > 0 ? styles.dueText : styles.clearText,
            ]}
          >
            {formatRupees(c.outstandingBalancePaise)}
          </Text>
        </View>
      </View>

      {c.outstandingBalancePaise > 0 ? (
        <View style={styles.custBottom}>
          <Button
            variant="bordered"
            color="secondary"
            size="sm"
            radius="md"
            fullWidth
            onPress={() => onSettlePress(c)}
          >
            Collect Udhar Payment
          </Button>
        </View>
      ) : null}
    </Card>
  );
});

export default function CustomersScreen() {
  const language = useAuthStore((s) => s.language);
  const { business, isRoleLoaded } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      isRoleLoaded: s.isRoleLoaded,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];
  const canSettleUdhar = canDo('settle_udhar');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [modalVisible, setModalVisible] = useState(false);

  // New Customer State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const loadCustomers = useCallback(async () => {
    if (!business) return;
    setIsRefreshing(true);
    try {
      const list = await billingService.getCustomers(business.id);
      setCustomers(list);
    } finally {
      setIsRefreshing(false);
    }
  }, [business]);

  useEffect(() => {
    if (!business || !canSettleUdhar) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setIsRefreshing(true);
        return billingService.getCustomers(business.id);
      })
      .then((list) => {
        if (!cancelled && list) setCustomers(list);
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [business, canSettleUdhar]);

  const filteredCustomers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        Boolean(c.phone && c.phone.includes(query))
    );
  }, [customers, debouncedSearch]);

  const handleSettleUdharPress = useCallback(
    (c: Customer) => {
      Alert.alert(
        'Collect Udhar Payment',
        `Settle ${formatRupees(c.outstandingBalancePaise)} balance from ${c.name}?`,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: 'Mark Collected',
            onPress: async () => {
              if (!business) return;
              const res = await billingService.settleCustomerUdhar(business.id, c.id);
              if (!res.success) {
                Alert.alert(t.error, res.error || 'Failed to settle udhar.');
                return;
              }
              const nextBalance = res.newBalancePaise ?? 0;
              setCustomers((prev) =>
                prev.map((item) =>
                  item.id === c.id ? { ...item, outstandingBalancePaise: nextBalance } : item
                )
              );
              Alert.alert(t.success, 'Udhar payment settled.');
            },
          },
        ]
      );
    },
    [business, t.cancel, t.error, t.success]
  );

  const renderCustomerRow = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerRowCard customer={item} onSettlePress={handleSettleUdharPress} />
    ),
    [handleSettleUdharPress]
  );

  const customerKeyExtractor = useCallback((item: Customer) => item.id, []);

  if (isRoleLoaded && !canSettleUdhar) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, 'Please enter customer name.');
      return;
    }
    if (!business) return;

    const res = await billingService.addCustomer(business.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
    });

    if (res.error || !res.customer) {
      Alert.alert(t.error, res.error || 'Failed to add customer.');
      return;
    }

    setCustomers([res.customer, ...customers]);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setModalVisible(false);
    Alert.alert(t.success, 'Customer added successfully.');
  };

  return (
    <View style={styles.container}>
      <Header title={t.customersTitle} showBack={true} />

      <View style={styles.searchRow}>
        <Input
          placeholder="Search by customer name or mobile..."
          value={search}
          onChangeText={setSearch}
          startContent={<Search size={18} color={COLORS.textSecondary} />}
          style={styles.searchInput}
        />
        <Button
          color="primary"
          size="md"
          radius="md"
          startContent={<Plus size={16} color={COLORS.white} />}
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
        >
          Add
        </Button>
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={customerKeyExtractor}
        renderItem={renderCustomerRow}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadCustomers} />}
        ListEmptyComponent={
          <Card radius="lg" shadow="sm" style={styles.emptyCard}>
            <Users size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
            <Text style={styles.emptyTitle}>No customers registered yet</Text>
            <Text style={styles.emptySub}>Tap &apos;Add&apos; to register a customer account with Udhar tracking.</Text>
          </Card>
        }
      />

      {/* Add Customer Modal */}
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Add New Customer
          </Text>
        </ModalHeader>
        <ModalBody>
          <Input
            label="Customer Full Name *"
            placeholder="e.g. S. Kumar"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Mobile Number"
            placeholder="10-digit number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Email Address"
            placeholder="customer@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Input
            label="Address"
            placeholder="Street, Area, Landmark"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
          />

          <Input
            label="GSTIN (For B2B Billing)"
            placeholder="15-character GSTIN"
            value={gstin}
            onChangeText={(txt) => setGstin(txt.toUpperCase())}
          />

          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.modalSubmit}
            onPress={handleAddCustomer}
          >
            Save Customer Profile
          </Button>
        </ModalBody>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  addBtn: {
    height: 44,
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
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  custCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  custTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  custName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  custDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  custPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  custAddress: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  balanceBlock: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  balanceVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  dueText: {
    color: COLORS.error,
  },
  clearText: {
    color: COLORS.success,
  },
  custBottom: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  modalSubmit: {
    marginTop: SPACING.sm,
  },
});
