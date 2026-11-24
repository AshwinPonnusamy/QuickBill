import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Divider } from '../components/heroui';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { billingService } from '../services/billing.service';
import { formatRupees } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { Customer } from '../types';
import { Search, Plus, Users, Phone, MapPin } from '../components/common/Icons';

export default function CustomersScreen() {
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // New Customer State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const loadCustomers = async () => {
    if (!business) return;
    const list = await billingService.getCustomers(business.id);
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, [business]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, 'Please enter customer name.');
      return;
    }
    if (!business) return;

    const newCust = await billingService.addCustomer(business.id, {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
    });

    setCustomers([newCust, ...customers]);
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredCustomers.length === 0 ? (
          <Card radius="lg" shadow="sm" style={styles.emptyCard}>
            <Users size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
            <Text style={styles.emptyTitle}>No customers registered yet</Text>
            <Text style={styles.emptySub}>Tap 'Add' to register a customer account with Udhar tracking.</Text>
          </Card>
        ) : (
          filteredCustomers.map((c) => (
            <Card key={c.id} radius="lg" shadow="sm" style={styles.custCard}>
              <View style={styles.custTop}>
                <View>
                  <Text style={styles.custName}>{c.name}</Text>
                  <View style={styles.custDetailRow}>
                    <Phone size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.custPhone}>{c.phone || 'No phone recorded'}</Text>
                  </View>
                  {c.address ? (
                    <View style={styles.custDetailRow}>
                      <MapPin size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.custAddress}>{c.address}</Text>
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
                    onPress={() =>
                      Alert.alert(
                        'Collect Udhar Payment',
                        `Settle ${formatRupees(c.outstandingBalancePaise)} balance from ${c.name}?`,
                        [
                          { text: t.cancel, style: 'cancel' },
                          {
                            text: 'Mark Collected',
                            onPress: () => {
                              setCustomers(
                                customers.map((item) =>
                                  item.id === c.id ? { ...item, outstandingBalancePaise: 0 } : item
                                )
                              );
                              Alert.alert(t.success, 'Udhar payment settled.');
                            },
                          },
                        ]
                      )
                    }
                  >
                    Collect Udhar Payment
                  </Button>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>

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
