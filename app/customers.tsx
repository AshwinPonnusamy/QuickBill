import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Modal, Portal } from 'react-native-paper';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { billingService } from '../services/billing.service';
import { formatRupees } from '../utils/billingCalculator';
import { TRANSLATIONS } from '../constants/translations';
import { Customer } from '../types';
import { Search, Plus, Users, Phone, MapPin } from 'lucide-react-native';

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
        <TextInput
          placeholder="Search by customer name or mobile..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.secondary}
          style={styles.searchInput}
          left={<TextInput.Icon icon={() => <Search size={18} color={COLORS.textSecondary} />} />}
        />
        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          textColor={COLORS.white}
          style={styles.addBtn}
          icon={() => <Plus size={16} color={COLORS.white} />}
          onPress={() => setModalVisible(true)}
        >
          Add
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredCustomers.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Users size={40} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
            <Text style={styles.emptyTitle}>No customers registered yet</Text>
            <Text style={styles.emptySub}>Tap 'Add' to register a customer account with Udhar tracking.</Text>
          </Surface>
        ) : (
          filteredCustomers.map((c) => (
            <Surface key={c.id} style={styles.custCard} elevation={1}>
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
                    mode="outlined"
                    textColor={COLORS.secondary}
                    style={styles.collectBtn}
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
            </Surface>
          ))
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalBox}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Add New Customer
          </Text>

          <TextInput
            label="Customer Full Name *"
            placeholder="e.g. S. Kumar"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Mobile Number"
            placeholder="10-digit number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Email Address"
            placeholder="customer@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Address"
            placeholder="Street, Area, Landmark"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="GSTIN (For B2B Billing)"
            placeholder="15-character GSTIN"
            value={gstin}
            onChangeText={(txt) => setGstin(txt.toUpperCase())}
            mode="outlined"
            style={styles.modalInput}
          />

          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            style={styles.modalSubmit}
            onPress={handleAddCustomer}
          >
            Save Customer Profile
          </Button>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surface,
  },
  addBtn: {
    height: 44,
    justifyContent: 'center',
    borderRadius: ROUNDNESS.md,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  custCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    marginTop: 2,
  },
  custAddress: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  balanceBlock: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  collectBtn: {
    borderRadius: ROUNDNESS.md,
    borderColor: COLORS.secondary,
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
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    margin: SPACING.base,
    borderRadius: ROUNDNESS.xl,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  modalInput: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  modalSubmit: {
    marginTop: SPACING.md,
    borderRadius: ROUNDNESS.md,
  },
});

