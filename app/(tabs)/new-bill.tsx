import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Modal, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { useBillStore } from '../../store/bill.store';
import { billingService } from '../../services/billing.service';
import { formatRupees, rupeesToPaise } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { Customer, Product, ProductUnit } from '../../types';

export default function CreateBillScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { products, categories } = useProductStore();
  const { 
    cart, 
    customer, 
    addToCart, 
    updateQuantity, 
    removeFromCart, 
    addCustomItem, 
    setCustomer, 
    discountType, 
    discountValue, 
    setDiscount,
    clearBill, 
    getCalculation 
  } = useBillStore();
  const t = TRANSLATIONS[language];

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals state
  const [customItemVisible, setCustomItemVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customUnit, setCustomUnit] = useState<ProductUnit>('item');

  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discType, setDiscType] = useState<'none' | 'fixed' | 'percentage'>(discountType);
  const [discVal, setDiscVal] = useState(String(discountValue || ''));

  useEffect(() => {
    if (business) {
      billingService.getCustomers(business.id).then(setCustomers);
    }
  }, [business]);

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCat ? p.categoryId === selectedCat : true;
    const matchesSearch = search.trim() === '' || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nameTamil && p.nameTamil.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.includes(search));
    return matchesCategory && matchesSearch;
  });

  const calculation = getCalculation();

  const handleAddCustom = () => {
    if (!customName.trim() || !customPrice || isNaN(Number(customPrice))) {
      Alert.alert(t.error, 'Please enter a valid item name and price.');
      return;
    }
    addCustomItem(customName.trim(), rupeesToPaise(Number(customPrice)), 0, customUnit);
    setCustomName('');
    setCustomPrice('');
    setCustomItemVisible(false);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustName.trim() || !business) {
      Alert.alert(t.error, 'Please enter customer name.');
      return;
    }
    const created = await billingService.addCustomer(business.id, {
      name: newCustName.trim(),
      phone: newCustPhone.trim() || undefined,
    });
    setCustomers([created, ...customers]);
    setCustomer(created);
    setNewCustName('');
    setNewCustPhone('');
    setCustomerModalVisible(false);
  };

  const handleApplyDiscount = () => {
    const num = Number(discVal) || 0;
    setDiscount(discType, num);
    setDiscountModalVisible(false);
  };

  const handleProceed = () => {
    if (cart.length === 0) {
      Alert.alert(t.error, t.cartEmpty);
      return;
    }
    router.push('/bill-review' as any);
  };

  return (
    <View style={styles.container}>
      <Header title={t.createBillTitle} showBack={false} />

      {/* Customer Bar */}
      <Surface style={styles.customerBar} elevation={1}>
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setCustomerModalVisible(true)}
        >
          <Text style={styles.customerIcon}>👤</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Customer:</Text>
            <Text style={styles.customerValue} numberOfLines={1}>
              {customer ? `${customer.name} (${customer.phone || 'No phone'})` : t.walkInCustomer}
            </Text>
          </View>
          <Text style={styles.changeText}>Change ▾</Text>
        </TouchableOpacity>

        {customer ? (
          <TouchableOpacity onPress={() => setCustomer(null)} style={styles.clearCustBtn}>
            <Text style={styles.clearCustText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </Surface>

      {/* Search Bar & Custom Item Trigger */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder={t.search}
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.secondary}
          style={styles.searchInput}
          left={<TextInput.Icon icon={() => <Text>🔍</Text>} />}
          right={
            search ? (
              <TextInput.Icon icon={() => <Text>✕</Text>} onPress={() => setSearch('')} />
            ) : null
          }
        />
        <Button
          mode="contained-tonal"
          buttonColor={COLORS.primaryContainer}
          textColor={COLORS.primary}
          style={styles.customBtn}
          onPress={() => setCustomItemVisible(true)}
        >
          + Custom
        </Button>
      </View>

      {/* Categories Horizontal Ribbon */}
      <View style={styles.categoryRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setSelectedCat(null)}
            style={[styles.categoryChip, selectedCat === null && styles.activeCategoryChip]}
          >
            <Text
              style={[styles.categoryChipText, selectedCat === null && styles.activeCategoryChipText]}
            >
              {t.all}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[styles.categoryChip, selectedCat === cat.id && styles.activeCategoryChip]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCat === cat.id && styles.activeCategoryChipText,
                ]}
              >
                {language === 'ta' && cat.nameTamil ? cat.nameTamil : cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => {
          const inCartItem = cart.find((c) => c.productId === item.id);
          const cartQty = inCartItem?.quantity || 0;

          return (
            <Surface style={styles.productCard} elevation={1}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {language === 'ta' && item.nameTamil ? item.nameTamil : item.name}
                </Text>
                <Text style={styles.productUnit}>per {item.unit}</Text>
                <Text style={styles.productPrice}>{formatRupees(item.sellingPricePaise)}</Text>
              </View>

              {cartQty === 0 ? (
                <TouchableOpacity
                  onPress={() => addToCart(item, 1)}
                  style={styles.addBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>+ ADD</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(inCartItem!.id, cartQty - 1)}
                    style={styles.stepperBtn}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{cartQty}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(inCartItem!.id, cartQty + 1)}
                    style={styles.stepperBtn}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Surface>
          );
        }}
      />

      {/* Cart Summary Drawer / Bottom Bar */}
      <Surface style={styles.bottomBar} elevation={4}>
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={styles.discountTrigger}
            onPress={() => setDiscountModalVisible(true)}
          >
            <Text style={styles.discountText}>
              🏷️ {calculation.discountPaise > 0 ? `-${formatRupees(calculation.discountPaise)}` : 'Add Discount'}
            </Text>
          </TouchableOpacity>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>{cart.length} items • Subtotal {formatRupees(calculation.subtotalPaise)}</Text>
            <Text style={styles.grandTotalText}>{formatRupees(calculation.grandTotalPaise)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {cart.length > 0 ? (
            <TouchableOpacity onPress={clearBill} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}

          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            style={[styles.continueBtn, cart.length === 0 && styles.disabledBtn]}
            contentStyle={styles.continueBtnContent}
            disabled={cart.length === 0}
            onPress={handleProceed}
          >
            {t.proceedToReview} →
          </Button>
        </View>
      </Surface>

      {/* MODAL 1: Add Custom Item */}
      <Portal>
        <Modal
          visible={customItemVisible}
          onDismiss={() => setCustomItemVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Add Custom Item
          </Text>
          <TextInput
            label="Item Description"
            placeholder="e.g. Samosa Plate / Custom Charge"
            value={customName}
            onChangeText={setCustomName}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Price (₹)"
            placeholder="e.g. 50"
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="numeric"
            mode="outlined"
            style={styles.modalInput}
            left={<TextInput.Affix text="₹ " />}
          />
          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            style={styles.modalSubmit}
            onPress={handleAddCustom}
          >
            Add to Bill Cart
          </Button>
        </Modal>
      </Portal>

      {/* MODAL 2: Customer Selection */}
      <Portal>
        <Modal
          visible={customerModalVisible}
          onDismiss={() => setCustomerModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Customer
          </Text>
          <TouchableOpacity
            style={styles.customerOption}
            onPress={() => {
              setCustomer(null);
              setCustomerModalVisible(false);
            }}
          >
            <Text style={styles.custOptionName}>{t.walkInCustomer}</Text>
            <Text style={styles.custOptionPhone}>General retail sale</Text>
          </TouchableOpacity>

          <ScrollView style={{ maxHeight: 200, marginVertical: 8 }}>
            {customers.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.customerOption}
                onPress={() => {
                  setCustomer(c);
                  setCustomerModalVisible(false);
                }}
              >
                <Text style={styles.custOptionName}>{c.name}</Text>
                <Text style={styles.custOptionPhone}>{c.phone || 'No phone'} • Udhar: {formatRupees(c.outstandingBalancePaise)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.orDivider}>— or Add New Customer —</Text>
          <TextInput
            label="Customer Name"
            placeholder="Full Name"
            value={newCustName}
            onChangeText={setNewCustName}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Mobile Number (Optional)"
            placeholder="10-digit phone"
            value={newCustPhone}
            onChangeText={setNewCustPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.modalInput}
          />
          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            style={styles.modalSubmit}
            onPress={handleAddNewCustomer}
          >
            Save & Select Customer
          </Button>
        </Modal>
      </Portal>

      {/* MODAL 3: Discount */}
      <Portal>
        <Modal
          visible={discountModalVisible}
          onDismiss={() => setDiscountModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Apply Bill Discount
          </Text>
          <View style={styles.discTypeRow}>
            <TouchableOpacity
              onPress={() => setDiscType('fixed')}
              style={[styles.discTypeBtn, discType === 'fixed' && styles.activeDiscType]}
            >
              <Text style={styles.discTypeText}>Fixed (₹)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDiscType('percentage')}
              style={[styles.discTypeBtn, discType === 'percentage' && styles.activeDiscType]}
            >
              <Text style={styles.discTypeText}>Percentage (%)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDiscType('none');
                setDiscVal('');
              }}
              style={[styles.discTypeBtn, discType === 'none' && styles.activeDiscType]}
            >
              <Text style={styles.discTypeText}>None</Text>
            </TouchableOpacity>
          </View>

          {discType !== 'none' ? (
            <TextInput
              label={discType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              value={discVal}
              onChangeText={setDiscVal}
              keyboardType="numeric"
              mode="outlined"
              style={styles.modalInput}
            />
          ) : null}

          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            style={styles.modalSubmit}
            onPress={handleApplyDiscount}
          >
            Apply Discount
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
  customerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.base,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  customerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  changeText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  clearCustBtn: {
    padding: 6,
    marginLeft: 8,
  },
  clearCustText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surface,
  },
  customBtn: {
    height: 44,
    justifyContent: 'center',
    borderRadius: ROUNDNESS.md,
  },
  categoryRibbon: {
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  activeCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeCategoryChipText: {
    color: COLORS.white,
  },
  productList: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 150,
  },
  productCard: {
    flex: 1,
    margin: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    minHeight: 130,
  },
  productInfo: {
    marginBottom: SPACING.sm,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  productUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: ROUNDNESS.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondaryDark,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.sm,
    padding: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontWeight: '800',
    fontSize: 14,
    color: COLORS.primary,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  discountTrigger: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  grandTotalText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearText: {
    color: COLORS.error,
    fontWeight: 'bold',
    fontSize: 13,
  },
  continueBtn: {
    flex: 1,
    borderRadius: ROUNDNESS.md,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  continueBtnContent: {
    paddingVertical: 8,
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
    marginBottom: SPACING.md,
  },
  modalInput: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  modalSubmit: {
    marginTop: SPACING.sm,
    borderRadius: ROUNDNESS.md,
  },
  customerOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  custOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  custOptionPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginVertical: SPACING.sm,
  },
  discTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  discTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeDiscType: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E6F8FA',
  },
  discTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

