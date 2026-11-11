import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Modal, Portal, Switch } from 'react-native-paper';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { productService } from '../../services/product.service';
import { formatRupees, paiseToRupees, rupeesToPaise } from '../../utils/billingCalculator';
import { TRANSLATIONS } from '../../constants/translations';
import { Product, ProductUnit } from '../../types';
import { Search, Plus, Boxes, Pencil } from 'lucide-react-native';

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

  return (
    <View style={styles.container}>
      <Header title={t.productsTitle} showBack={false} />

      {/* Top Search & Add Product Action */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder={t.search}
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
          onPress={openAddModal}
        >
          Add
        </Button>
      </View>

      {/* Categories ribbon */}
      <View style={styles.catRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setSelectedCat(null)}
            style={[styles.catChip, selectedCat === null && styles.activeCatChip]}
          >
            <Text style={[styles.catChipText, selectedCat === null && styles.activeCatChipText]}>
              {t.all} ({products.length})
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCat(c.id)}
              style={[styles.catChip, selectedCat === c.id && styles.activeCatChip]}
            >
              <Text style={[styles.catChipText, selectedCat === c.id && styles.activeCatChipText]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.lowStockThreshold;
          return (
            <Surface key={p.id} style={styles.prodCard} elevation={1}>
              <View style={styles.prodMain}>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodName}>{p.name}</Text>
                  <Text style={styles.prodMeta}>
                    GST {p.taxRate}% • {p.unit} {p.sku ? `• SKU: ${p.sku}` : ''}
                  </Text>
                </View>

                <View style={styles.priceStockBlock}>
                  <Text style={styles.prodPrice}>{formatRupees(p.sellingPricePaise)}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStockProduct(p);
                      setStockModalVisible(true);
                    }}
                    style={[styles.stockBadge, isLow && styles.lowStockBadge]}
                  >
                    <Text style={[styles.stockText, isLow && styles.lowStockText]}>
                      {p.stockQuantity} {p.unit}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStockProduct(p);
                    setStockModalVisible(true);
                  }}
                  style={styles.stockAdjBtn}
                >
                  <Boxes size={14} color={COLORS.secondary} style={{ marginRight: 4 }} />
                  <Text style={styles.stockAdjText}>Adjust Stock</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => openEditModal(p)} style={styles.editBtn}>
                  <Pencil size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          );
        })}
      </ScrollView>

      {/* MODAL 1: Add / Edit Product */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalScrollBox}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </Text>

            <TextInput
              label={t.productName + ' *'}
              placeholder="e.g. Basmati Rice"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.modalInput}
            />

            <View style={styles.twoCol}>
              <TextInput
                label={t.sellingPrice + ' *'}
                placeholder="100"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, { flex: 1 }]}
              />

              <TextInput
                label={t.purchasePrice}
                placeholder="80"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, { flex: 1 }]}
              />
            </View>

            <View style={styles.twoCol}>
              <TextInput
                label={t.taxRate}
                placeholder="5"
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, { flex: 1 }]}
              />

              <TextInput
                label={t.stockQty}
                placeholder="10"
                value={stockQuantity}
                onChangeText={setStockQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.modalInput, { flex: 1 }]}
              />
            </View>

            {/* Units Selection */}
            <Text style={styles.unitLabel}>Unit of Measure:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setUnit(u)}
                  style={[styles.unitChip, unit === u && styles.activeUnitChip]}
                >
                  <Text style={[styles.unitText, unit === u && styles.activeUnitText]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mark as Favourite (Fast Access)</Text>
              <Switch value={isFavourite} onValueChange={setIsFavourite} color={COLORS.secondary} />
            </View>

            <Button
              mode="contained"
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              style={styles.submitBtn}
              onPress={handleSaveProduct}
            >
              {isEditing ? 'Update Product' : 'Save Product to Catalog'}
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* MODAL 2: Stock Adjustment */}
      <Portal>
        <Modal
          visible={stockModalVisible}
          onDismiss={() => setStockModalVisible(false)}
          contentContainerStyle={styles.modalBox}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Adjust Stock: {stockProduct?.name}
          </Text>
          <Text style={styles.currentStockText}>
            Current Stock: <Text style={{ fontWeight: 'bold' }}>{stockProduct?.stockQuantity} {stockProduct?.unit}</Text>
          </Text>

          <View style={styles.movementTypeRow}>
            {[
              { id: 'purchase', label: '+ Stock In' },
              { id: 'return', label: '- Stock Out' },
              { id: 'adjustment', label: 'Correction' },
            ].map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMovementType(m.id as any)}
                style={[styles.moveChip, movementType === m.id && styles.activeMoveChip]}
              >
                <Text style={[styles.moveText, movementType === m.id && styles.activeMoveText]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="Quantity"
            placeholder="e.g. 10"
            value={stockDelta}
            onChangeText={setStockDelta}
            keyboardType="numeric"
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Reason / Supplier Notes"
            placeholder="e.g. New wholesale delivery"
            value={stockReason}
            onChangeText={setStockReason}
            mode="outlined"
            style={styles.modalInput}
          />

          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            style={styles.submitBtn}
            onPress={handleStockAdjustment}
          >
            Apply Stock Update
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
  catRibbon: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  activeCatChip: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeCatChipText: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  prodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  stockBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDNESS.sm,
    marginTop: 4,
  },
  lowStockBadge: {
    backgroundColor: COLORS.errorLight,
  },
  stockText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  lowStockText: {
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  stockAdjBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.primaryContainer,
  },
  stockAdjText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  editText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalScrollBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    margin: SPACING.base,
    borderRadius: ROUNDNESS.xl,
    maxHeight: '90%',
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
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  activeUnitChip: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  activeUnitText: {
    color: COLORS.white,
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
    borderRadius: ROUNDNESS.md,
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
  moveChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  activeMoveChip: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
  },
  moveText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  activeMoveText: {
    color: COLORS.primary,
  },
});

