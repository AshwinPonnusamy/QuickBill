import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Switch, Badge, Divider } from '../../components/heroui';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { productService } from '../../services/product.service';
import { formatRupees, paiseToRupees, rupeesToPaise } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { Product, ProductUnit } from '../../types';
import { Search, Plus, Boxes, Pencil, Trash2 } from '../../components/common/Icons';

const UNITS: ProductUnit[] = ['item', 'kg', 'g', 'liter', 'ml', 'meter', 'packet', 'box', 'plate', 'cup'];

export default function ProductsScreen() {
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { products, categories, addProduct, updateProduct, deleteProduct, adjustStock } = useProductStore();
  const t = TRANSLATIONS[language];

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Add / Edit Product Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('item');
  const [taxRate, setTaxRate] = useState('5');
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isFavourite, setIsFavourite] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  // Quick Stock Adjustment Modal
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [movementType, setMovementType] = useState<'purchase' | 'return' | 'adjustment'>('purchase');
  const [stockReason, setStockReason] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat ? p.categoryId === selectedCat : true;
    const matchesSearch = search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.includes(search));
    return matchesCat && matchesSearch;
  });

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setSku('');
    setSellingPrice('');
    setPurchasePrice('');
    setUnit('item');
    setTaxRate(String(business?.defaultTaxRate || 5));
    setIsTaxInclusive(business?.taxInclusive ?? true);
    setStockQuantity('20');
    setLowStockThreshold('5');
    setIsFavourite(false);
    setCategoryId(undefined);
    setModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setIsEditing(true);
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku || '');
    setSellingPrice(String(paiseToRupees(p.sellingPricePaise)));
    setPurchasePrice(p.purchasePricePaise ? String(paiseToRupees(p.purchasePricePaise)) : '');
    setUnit(p.unit);
    setTaxRate(String(p.taxRate));
    setIsTaxInclusive(p.isTaxInclusive);
    setStockQuantity(String(p.stockQuantity));
    setLowStockThreshold(String(p.lowStockThreshold));
    setIsFavourite(p.isFavourite);
    setCategoryId(p.categoryId);
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, 'Please enter a product name.');
      return;
    }
    if (!sellingPrice || isNaN(Number(sellingPrice))) {
      Alert.alert(t.error, 'Please enter a valid selling price.');
      return;
    }
    if (!business) return;

    const payload = {
      id: isEditing && editingId ? editingId : undefined,
      name: name.trim(),
      sku: sku.trim() || undefined,
      sellingPricePaise: rupeesToPaise(Number(sellingPrice)),
      purchasePricePaise: purchasePrice ? rupeesToPaise(Number(purchasePrice)) : undefined,
      unit,
      taxRate: Number(taxRate) || 0,
      isTaxInclusive,
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isFavourite,
      isActive: true,
      categoryId,
    };

    const res = await productService.saveProduct(business.id, payload as any);
    if (res.product) {
      if (isEditing) {
        updateProduct(res.product.id, res.product);
      } else {
        addProduct(res.product);
      }
      setModalVisible(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockProduct || !business || !stockDelta || isNaN(Number(stockDelta))) {
      Alert.alert(t.error, 'Please enter valid stock quantity.');
      return;
    }

    const qty = Number(stockDelta);
    await productService.recordStockAdjustment(
      business.id,
      stockProduct.id,
      movementType,
      qty,
      stockProduct.stockQuantity,
      stockReason || `Manual ${movementType}`
    );

    adjustStock(stockProduct.id, movementType === 'return' ? -qty : qty);
    setStockModalVisible(false);
    setStockDelta('');
    setStockReason('');
  };

  const handleDeleteProduct = () => {
    if (!editingId) return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name}" from your catalog?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (business) {
              await productService.deleteProduct(business.id, editingId);
              deleteProduct(editingId);
              setModalVisible(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.productsTitle} showBack={false} />

      {/* Top Search & Add Product Action */}
      <View style={styles.searchRow}>
        <Input
          placeholder={t.search}
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
          onPress={openAddModal}
          style={styles.addBtn}
        >
          Add
        </Button>
      </View>

      {/* Categories ribbon */}
      <View style={styles.catRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScrollContent}>
          <Button
            variant={selectedCat === null ? 'solid' : 'bordered'}
            color={selectedCat === null ? 'secondary' : 'default'}
            size="sm"
            radius="md"
            onPress={() => setSelectedCat(null)}
          >
            {`${t.all} (${products.length})`}
          </Button>
          {categories.map((c) => {
            const isSelected = selectedCat === c.id;
            return (
              <Button
                key={c.id}
                variant={isSelected ? 'solid' : 'bordered'}
                color={isSelected ? 'secondary' : 'default'}
                size="sm"
                radius="md"
                onPress={() => setSelectedCat(c.id)}
              >
                {c.name}
              </Button>
            );
          })}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.lowStockThreshold;
          return (
            <Card key={p.id} radius="lg" shadow="sm" style={styles.prodCard}>
              <View style={styles.prodMain}>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodName}>{p.name}</Text>
                  <Text style={styles.prodMeta}>
                    GST {p.taxRate}% • {p.unit} {p.sku ? `• SKU: ${p.sku}` : ''}
                  </Text>
                </View>

                <View style={styles.priceStockBlock}>
                  <Text style={styles.prodPrice}>{formatRupees(p.sellingPricePaise)}</Text>
                  <Badge
                    color={isLow ? 'danger' : 'default'}
                    variant="flat"
                    size="sm"
                    style={{ marginTop: 4 }}
                  >
                    {p.stockQuantity} {p.unit}
                  </Badge>
                </View>
              </View>

              <Divider style={{ marginVertical: SPACING.sm }} />

              <View style={styles.actionRow}>
                <Button
                  variant="flat"
                  color="secondary"
                  size="sm"
                  radius="sm"
                  startContent={<Boxes size={14} color={COLORS.secondary} />}
                  onPress={() => {
                    setStockProduct(p);
                    setStockModalVisible(true);
                  }}
                >
                  Adjust Stock
                </Button>

                <Button
                  variant="flat"
                  color="primary"
                  size="sm"
                  radius="sm"
                  startContent={<Pencil size={14} color={COLORS.primary} />}
                  onPress={() => openEditModal(p)}
                >
                  Edit
                </Button>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* MODAL 1: Add / Edit Product */}
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalScrollBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </Text>
        </ModalHeader>
        <ModalBody>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Input
              label={t.productName + ' *'}
              placeholder="e.g. Basmati Rice"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.twoCol}>
              <Input
                label={t.sellingPrice + ' *'}
                placeholder="100"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />

              <Input
                label={t.purchasePrice}
                placeholder="80"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.twoCol}>
              <Input
                label={t.taxRate}
                placeholder="5"
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />

              <Input
                label={t.stockQty}
                placeholder="10"
                value={stockQuantity}
                onChangeText={setStockQuantity}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            {/* Units Selection */}
            <Text style={styles.unitLabel}>Unit of Measure:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitRow} contentContainerStyle={{ gap: 6 }}>
              {UNITS.map((u) => {
                const isSelected = unit === u;
                return (
                  <Button
                    key={u}
                    variant={isSelected ? 'solid' : 'bordered'}
                    color={isSelected ? 'secondary' : 'default'}
                    size="sm"
                    radius="sm"
                    onPress={() => setUnit(u)}
                  >
                    {u}
                  </Button>
                );
              })}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mark as Favourite (Fast Access)</Text>
              <Switch isSelected={isFavourite} onValueChange={setIsFavourite} color="secondary" />
            </View>

            <Button
              color="primary"
              size="lg"
              radius="md"
              fullWidth
              style={styles.submitBtn}
              onPress={handleSaveProduct}
            >
              {isEditing ? 'Update Product' : 'Save Product to Catalog'}
            </Button>

            {isEditing ? (
              <Button
                variant="bordered"
                color="danger"
                size="md"
                radius="md"
                fullWidth
                style={{ marginTop: SPACING.sm }}
                startContent={<Trash2 size={16} color={COLORS.error} />}
                onPress={handleDeleteProduct}
              >
                Delete Product
              </Button>
            ) : null}
          </ScrollView>
        </ModalBody>
      </Modal>

      {/* MODAL 2: Stock Adjustment */}
      <Modal
        visible={stockModalVisible}
        onDismiss={() => setStockModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            Adjust Stock: {stockProduct?.name}
          </Text>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.currentStockText}>
            Current Stock: <Text style={{ fontWeight: 'bold' }}>{stockProduct?.stockQuantity} {stockProduct?.unit}</Text>
          </Text>

          <View style={styles.movementTypeRow}>
            {[
              { id: 'purchase', label: '+ Stock In' },
              { id: 'return', label: '- Stock Out' },
              { id: 'adjustment', label: 'Correction' },
            ].map((m) => {
              const isSelected = movementType === m.id;
              return (
                <Button
                  key={m.id}
                  variant={isSelected ? 'solid' : 'bordered'}
                  color={isSelected ? 'secondary' : 'default'}
                  size="sm"
                  radius="md"
                  style={{ flex: 1 }}
                  onPress={() => setMovementType(m.id as any)}
                >
                  {m.label}
                </Button>
              );
            })}
          </View>

          <Input
            label="Quantity"
            placeholder="e.g. 10"
            value={stockDelta}
            onChangeText={setStockDelta}
            keyboardType="numeric"
          />

          <Input
            label="Reason / Supplier Notes"
            placeholder="e.g. New wholesale delivery"
            value={stockReason}
            onChangeText={setStockReason}
          />

          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.submitBtn}
            onPress={handleStockAdjustment}
          >
            Apply Stock Update
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
  catRibbon: {
    paddingVertical: SPACING.xs,
  },
  catScrollContent: {
    paddingHorizontal: SPACING.base,
    gap: 8,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  prodCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prodMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodInfo: {
    flex: 1,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  prodMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priceStockBlock: {
    alignItems: 'flex-end',
  },
  prodPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalScrollBox: {
    maxHeight: '90%',
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  twoCol: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  unitRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  submitBtn: {
    marginTop: SPACING.md,
  },
  currentStockText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  movementTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
});
