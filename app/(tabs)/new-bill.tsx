import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Divider } from '../../components/heroui';
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
import { User, Search, X, Tag, ChevronDown } from '../../components/common/Icons';

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
      <Card radius="none" shadow="sm" style={styles.customerBar}>
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setCustomerModalVisible(true)}
        >
          <View style={styles.customerIconWrapper}>
            <User size={18} color={COLORS.secondary} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Customer:</Text>
            <Text style={styles.customerValue} numberOfLines={1}>
              {customer ? `${customer.name} (${customer.phone || 'No phone'})` : t.walkInCustomer}
            </Text>
          </View>
          <View style={styles.changeRow}>
            <Text style={styles.changeText}>Change</Text>
            <ChevronDown size={14} color={COLORS.secondary} style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>

        {customer ? (
          <TouchableOpacity onPress={() => setCustomer(null)} style={styles.clearCustBtn}>
            <X size={16} color={COLORS.error} />
          </TouchableOpacity>
        ) : null}
      </Card>

      {/* Search Bar & Custom Item Trigger */}
      <View style={styles.searchRow}>
        <Input
          placeholder={t.search}
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
        <Button
          variant="flat"
          color="primary"
          size="md"
          radius="md"
          onPress={() => setCustomItemVisible(true)}
          style={styles.customBtn}
        >
          + Custom
        </Button>
      </View>

      {/* Categories Horizontal Ribbon */}
      <View style={styles.categoryRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
          <Button
            variant={selectedCat === null ? 'solid' : 'bordered'}
            color={selectedCat === null ? 'secondary' : 'default'}
            size="sm"
            radius="md"
            onPress={() => setSelectedCat(null)}
          >
            {t.all}
          </Button>

          {categories.map((cat) => {
            const isSelected = selectedCat === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                onPress={() => setSelectedCat(cat.id)}
              >
                {cat.name}
              </Button>
            );
          })}
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
            <Card radius="lg" shadow="sm" style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productUnit}>per {item.unit}</Text>
                <Text style={styles.productPrice}>{formatRupees(item.sellingPricePaise)}</Text>
              </View>

              {cartQty === 0 ? (
                <Button
                  color="secondary"
                  variant="flat"
                  size="sm"
                  radius="sm"
                  fullWidth
                  onPress={() => addToCart(item, 1)}
                >
                  + ADD
                </Button>
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
            </Card>
          );
        }}
      />

      {/* Cart Summary Drawer / Bottom Bar */}
      <Card radius="none" shadow="lg" style={styles.bottomBar}>
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={styles.discountTrigger}
            onPress={() => setDiscountModalVisible(true)}
          >
            <View style={styles.discountRow}>
              <Tag size={14} color={COLORS.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.discountText}>
                {calculation.discountPaise > 0 ? `-${formatRupees(calculation.discountPaise)}` : 'Add Discount'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>{cart.length} items • Subtotal {formatRupees(calculation.subtotalPaise)}</Text>
            <Text style={styles.grandTotalText}>{formatRupees(calculation.grandTotalPaise)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {cart.length > 0 ? (
            <Button
              variant="light"
              color="danger"
              size="md"
              radius="md"
              onPress={clearBill}
            >
              Clear
            </Button>
          ) : null}

          <Button
            color="secondary"
            size="lg"
            radius="md"
            isDisabled={cart.length === 0}
            style={{ flex: 1 }}
            onPress={handleProceed}
          >
            {t.proceedToReview} →
          </Button>
        </View>
      </Card>

      {/* MODAL 1: Add Custom Item */}
      <Modal
        visible={customItemVisible}
        onDismiss={() => setCustomItemVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Add Custom Item
          </Text>
        </ModalHeader>
        <ModalBody>
          <Input
            label="Item Description"
            placeholder="e.g. Samosa Plate / Custom Charge"
            value={customName}
            onChangeText={setCustomName}
          />
          <Input
            label="Price (₹)"
            placeholder="e.g. 50"
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="numeric"
            startContent={<Text style={{ color: COLORS.textSecondary, fontWeight: 'bold' }}>₹</Text>}
          />
          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.modalSubmit}
            onPress={handleAddCustom}
          >
            Add to Bill Cart
          </Button>
        </ModalBody>
      </Modal>

      {/* MODAL 2: Customer Selection */}
      <Modal
        visible={customerModalVisible}
        onDismiss={() => setCustomerModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Select Customer
          </Text>
        </ModalHeader>
        <ModalBody>
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
          <Input
            label="Customer Name"
            placeholder="Full Name"
            value={newCustName}
            onChangeText={setNewCustName}
          />
          <Input
            label="Mobile Number (Optional)"
            placeholder="10-digit phone"
            value={newCustPhone}
            onChangeText={setNewCustPhone}
            keyboardType="phone-pad"
          />
          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.modalSubmit}
            onPress={handleAddNewCustomer}
          >
            Save & Select Customer
          </Button>
        </ModalBody>
      </Modal>

      {/* MODAL 3: Discount */}
      <Modal
        visible={discountModalVisible}
        onDismiss={() => setDiscountModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Apply Bill Discount
          </Text>
        </ModalHeader>
        <ModalBody>
          <View style={styles.discTypeRow}>
            <Button
              variant={discType === 'fixed' ? 'solid' : 'bordered'}
              color={discType === 'fixed' ? 'secondary' : 'default'}
              size="sm"
              radius="md"
              style={{ flex: 1 }}
              onPress={() => setDiscType('fixed')}
            >
              Fixed (₹)
            </Button>
            <Button
              variant={discType === 'percentage' ? 'solid' : 'bordered'}
              color={discType === 'percentage' ? 'secondary' : 'default'}
              size="sm"
              radius="md"
              style={{ flex: 1 }}
              onPress={() => setDiscType('percentage')}
            >
              Percentage (%)
            </Button>
            <Button
              variant={discType === 'none' ? 'solid' : 'bordered'}
              color={discType === 'none' ? 'secondary' : 'default'}
              size="sm"
              radius="md"
              style={{ flex: 1 }}
              onPress={() => {
                setDiscType('none');
                setDiscVal('');
              }}
            >
              None
            </Button>
          </View>

          {discType !== 'none' ? (
            <Input
              label={discType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              value={discVal}
              onChangeText={setDiscVal}
              keyboardType="numeric"
            />
          ) : null}

          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.modalSubmit}
            onPress={handleApplyDiscount}
          >
            Apply Discount
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
  customerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 0,
  },
  customBtn: {
    height: 44,
  },
  categoryRibbon: {
    marginBottom: SPACING.sm,
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING.base,
    gap: 8,
  },
  productList: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 150,
  },
  productCard: {
    flex: 1,
    margin: SPACING.xs,
    padding: SPACING.md,
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
  modalContent: {
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
});
