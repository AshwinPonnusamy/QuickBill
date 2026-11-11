import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Badge, Divider } from '../components/heroui';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { productService } from '../services/product.service';
import { TRANSLATIONS } from '../constants/translations';
import { Product } from '../types';
import { Plus, Minus } from '../components/common/Icons';

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
        <Button
          variant={activeTab === 'current' ? 'solid' : 'bordered'}
          color={activeTab === 'current' ? 'secondary' : 'default'}
          size="md"
          radius="md"
          style={{ flex: 1 }}
          onPress={() => setActiveTab('current')}
        >
          {`Stock Levels (${products.length})`}
        </Button>

        <Button
          variant={activeTab === 'history' ? 'solid' : 'bordered'}
          color={activeTab === 'history' ? 'secondary' : 'default'}
          size="md"
          radius="md"
          style={{ flex: 1 }}
          onPress={() => setActiveTab('history')}
        >
          {`Low Stock Alerts (${lowStockProducts.length})`}
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(activeTab === 'current' ? products : lowStockProducts).map((p) => {
          const isLow = p.stockQuantity <= p.lowStockThreshold;
          return (
            <Card key={p.id} radius="lg" shadow="sm" style={styles.card}>
              <View style={styles.cardMain}>
                <View style={styles.infoCol}>
                  <Text style={styles.prodName}>{p.name}</Text>
                  <Text style={styles.thresholdText}>
                    Alert limit: {p.lowStockThreshold} {p.unit}
                  </Text>
                </View>

                <View style={styles.stockCol}>
                  <Text style={[styles.qtyNum, isLow && styles.lowQtyNum]}>
                    {p.stockQuantity} {p.unit}
                  </Text>
                  <Badge
                    color={isLow ? 'danger' : 'success'}
                    variant="flat"
                    size="sm"
                    style={{ marginTop: 2 }}
                  >
                    {isLow ? 'LOW STOCK' : 'IN STOCK'}
                  </Badge>
                </View>
              </View>

              <Divider style={{ marginVertical: SPACING.sm }} />

              <View style={styles.btnRow}>
                <Button
                  variant="flat"
                  color="success"
                  size="sm"
                  radius="sm"
                  style={{ flex: 1 }}
                  startContent={<Plus size={14} color="#17C964" />}
                  onPress={() => {
                    setSelectedProduct(p);
                    setActionType('purchase');
                    setModalVisible(true);
                  }}
                >
                  Stock In
                </Button>

                <Button
                  variant="flat"
                  color="danger"
                  size="sm"
                  radius="sm"
                  style={{ flex: 1 }}
                  startContent={<Minus size={14} color="#F31260" />}
                  onPress={() => {
                    setSelectedProduct(p);
                    setActionType('return');
                    setModalVisible(true);
                  }}
                >
                  Stock Out
                </Button>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Stock Movement Modal */}
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            {actionType === 'purchase' ? 'Stock In (Purchase)' : 'Stock Out (Return/Waste)'}
          </Text>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.modalSub}>{selectedProduct?.name}</Text>

          <Input
            label="Quantity to adjust"
            placeholder="e.g. 25"
            value={qtyDelta}
            onChangeText={setQtyDelta}
            keyboardType="numeric"
            endContent={<Text style={{ color: COLORS.textSecondary }}>{selectedProduct?.unit || ''}</Text>}
          />

          <Input
            label="Reason / Invoice Number / Notes"
            placeholder="e.g. Delivery from Metro Cash & Carry"
            value={reason}
            onChangeText={setReason}
          />

          <Button
            color={actionType === 'purchase' ? 'success' : 'danger'}
            size="lg"
            radius="md"
            fullWidth
            style={styles.submitBtn}
            onPress={handleApplyMovement}
          >
            Record Movement
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
  tabBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
});
