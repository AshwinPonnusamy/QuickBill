import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, TextInput, Button, Modal, Portal } from 'react-native-paper';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { productService } from '../services/product.service';
import { TRANSLATIONS } from '../constants/translations';
import { Product } from '../types';

export default function InventoryScreen() {
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const { products, adjustStock } = useProductStore();
  const t = TRANSLATIONS[language];

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [qtyDelta, setQtyDelta] = useState('');
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState<'purchase' | 'return' | 'adjustment'>('purchase');

  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);

  const handleApplyMovement = async () => {
    if (!selectedProduct || !business || !qtyDelta || isNaN(Number(qtyDelta))) {
      Alert.alert(t.error, 'Please enter a valid stock quantity.');
      return;
    }

    const qty = Number(qtyDelta);
    await productService.recordStockAdjustment(
      business.id,
      selectedProduct.id,
      actionType,
      qty,
      selectedProduct.stockQuantity,
      reason || `Manual ${actionType}`
    );

    adjustStock(selectedProduct.id, actionType === 'return' ? -qty : qty);
    setModalVisible(false);
    setQtyDelta('');
    setReason('');
    Alert.alert(t.success, 'Stock balance updated and movement recorded.');
  };

  return (
    <View style={styles.container}>
      <Header title={t.inventoryTitle} showBack={true} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('current')}
          style={[styles.tabBtn, activeTab === 'current' && styles.activeTabBtn]}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Stock Levels ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[styles.tabBtn, activeTab === 'history' && styles.activeTabBtn]}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Low Stock Alerts ({lowStockProducts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(activeTab === 'current' ? products : lowStockProducts).map((p) => {
          const isLow = p.stockQuantity <= p.lowStockThreshold;
          return (
            <Surface key={p.id} style={styles.card} elevation={1}>
              <View style={styles.cardMain}>
                <View style={styles.infoCol}>
                  <Text style={styles.prodName}>{p.name}</Text>
                  {p.nameTamil ? <Text style={styles.prodTamil}>{p.nameTamil}</Text> : null}
                  <Text style={styles.thresholdText}>
                    Alert limit: {p.lowStockThreshold} {p.unit}
                  </Text>
                </View>

                <View style={styles.stockCol}>
                  <Text style={[styles.qtyNum, isLow && styles.lowQtyNum]}>
                    {p.stockQuantity} {p.unit}
                  </Text>
                  <View style={[styles.badge, isLow ? styles.lowBadge : styles.okBadge]}>
                    <Text style={[styles.badgeText, isLow ? styles.lowBadgeText : styles.okBadgeText]}>
                      {isLow ? 'LOW STOCK' : 'IN STOCK'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedProduct(p);
                    setActionType('purchase');
                    setModalVisible(true);
                  }}
                  style={[styles.actionBtn, styles.stockInBtn]}
                >
                  <Text style={styles.stockInText}>+ Stock In (Purchase)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedProduct(p);
                    setActionType('return');
                    setModalVisible(true);
                  }}
                  style={[styles.actionBtn, styles.stockOutBtn]}
                >
                  <Text style={styles.stockOutText}>- Stock Out (Damage/Return)</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          );
        })}
      </ScrollView>

      {/* Stock Movement Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalBox}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {actionType === 'purchase' ? 'Stock In (Purchase)' : 'Stock Out (Return/Waste)'}
          </Text>
          <Text style={styles.modalSub}>{selectedProduct?.name}</Text>

          <TextInput
            label="Quantity to adjust"
            placeholder="e.g. 25"
            value={qtyDelta}
            onChangeText={setQtyDelta}
            keyboardType="numeric"
            mode="outlined"
            style={styles.modalInput}
            right={<TextInput.Affix text={selectedProduct?.unit || ''} />}
          />

          <TextInput
            label="Reason / Invoice Number / Notes"
            placeholder="e.g. Delivery from Metro Cash & Carry"
            value={reason}
            onChangeText={setReason}
            mode="outlined"
            style={styles.modalInput}
          />

          <Button
            mode="contained"
            buttonColor={actionType === 'purchase' ? COLORS.success : COLORS.error}
            textColor={COLORS.white}
            style={styles.submitBtn}
            onPress={handleApplyMovement}
          >
            Record Movement
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
  tabBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  activeTabBtn: {
    backgroundColor: COLORS.primaryContainer,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  prodName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  prodTamil: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  thresholdText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  qtyNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  lowQtyNum: {
    color: COLORS.error,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  okBadge: {
    backgroundColor: COLORS.successLight,
  },
  lowBadge: {
    backgroundColor: COLORS.errorLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  okBadgeText: {
    color: COLORS.success,
  },
  lowBadgeText: {
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.sm,
    alignItems: 'center',
  },
  stockInBtn: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  stockInText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stockOutBtn: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
  },
  stockOutText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: 'bold',
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
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalInput: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  submitBtn: {
    marginTop: SPACING.md,
    borderRadius: ROUNDNESS.md,
  },
});

