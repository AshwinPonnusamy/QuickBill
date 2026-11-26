import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Switch, Divider } from '../components/heroui';
import { useRouter, Redirect } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { authService } from '../services/auth.service';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { useCan, RoleGate } from '../utils/permissions';
import { BusinessType } from '../types';
import {
  Store,
  Globe,
  Tag,
  Printer,
  Sparkles,
  Users,
  ShieldCheck,
  MessageSquare,
  LogOut,
  Trash2,
  ChevronRight,
} from '../components/common/Icons';

const SHOP_TYPES: { type: BusinessType; label: string }[] = [
  { type: 'retail', label: 'General Retail' },
  { type: 'grocery', label: 'Grocery / Kirana' },
  { type: 'supermarket', label: 'Supermarket' },
  { type: 'restaurant', label: 'Restaurant / Cafe' },
  { type: 'bakery', label: 'Bakery & Sweets' },
  { type: 'tea_shop', label: 'Tea / Snack Stall' },
  { type: 'clothing', label: 'Clothing / Textiles' },
  { type: 'other', label: 'Other' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { language, logout } = useAuthStore();
  const { business, subscription, isRoleLoaded, updateBusiness, resetBusinessSession } = useBusinessStore();
  const { setProducts, setCategories } = useProductStore();
  const canDo = useCan();
  const t = TRANSLATIONS[language];

  // Modals
  const [shopEditModal, setShopEditModal] = useState(false);
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [editName, setEditName] = useState(business?.name || '');
  const [editBusinessType, setEditBusinessType] = useState<BusinessType>(business?.businessType || 'retail');
  const [editOwnerName, setEditOwnerName] = useState(business?.ownerName || '');
  const [editPhone, setEditPhone] = useState(business?.phone || '');
  const [editEmail, setEditEmail] = useState(business?.email || '');
  const [editAddress, setEditAddress] = useState(business?.address || '');
  const [editIsGstRegistered, setEditIsGstRegistered] = useState(business?.isGstRegistered ?? false);
  const [editGstin, setEditGstin] = useState(business?.gstin || '');
  const [editDefaultTaxRate, setEditDefaultTaxRate] = useState(String(business?.defaultTaxRate ?? 5));
  const [editInvoicePrefix, setEditInvoicePrefix] = useState(business?.invoicePrefix || 'QB');
  const [taxInclusive, setTaxInclusive] = useState(business?.taxInclusive ?? true);

  const openShopEditModal = () => {
    setEditName(business?.name || '');
    setEditBusinessType(business?.businessType || 'retail');
    setEditOwnerName(business?.ownerName || '');
    setEditPhone(business?.phone || '');
    setEditEmail(business?.email || '');
    setEditAddress(business?.address || '');
    setEditIsGstRegistered(business?.isGstRegistered ?? false);
    setEditGstin(business?.gstin || '');
    setEditDefaultTaxRate(String(business?.defaultTaxRate ?? 5));
    setEditInvoicePrefix(business?.invoicePrefix || 'QB');
    setTaxInclusive(business?.taxInclusive ?? true);
    setShopEditModal(true);
  };

  const handleSaveShopDetails = async () => {
    if (!business) return;
    if (!editName.trim()) {
      Alert.alert(t.error, 'Please enter your shop name.');
      return;
    }
    if (!editOwnerName.trim()) {
      Alert.alert(t.error, 'Please enter the owner name.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert(t.error, 'Please enter a contact phone number.');
      return;
    }
    if (!editAddress.trim()) {
      Alert.alert(t.error, 'Please enter your shop address.');
      return;
    }
    const normalizedGstin = editGstin.trim().toUpperCase();
    if (editIsGstRegistered && normalizedGstin.length !== 15) {
      Alert.alert(t.error, 'Please enter a valid 15-character GSTIN.');
      return;
    }

    const updates = {
      name: editName.trim(),
      businessType: editBusinessType,
      ownerName: editOwnerName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim(),
      isGstRegistered: editIsGstRegistered,
      gstin: editIsGstRegistered ? normalizedGstin : undefined,
      defaultTaxRate: Number(editDefaultTaxRate) || 0,
      invoicePrefix: editInvoicePrefix.trim().toUpperCase() || 'QB',
      taxInclusive,
    };

    setIsSavingShop(true);
    try {
      const res = await businessService.updateBusiness(business.id, updates);
      if (!res.success) {
        Alert.alert(t.error, res.error || 'Failed to update shop profile.');
        return;
      }
      updateBusiness(updates);
      setShopEditModal(false);
      Alert.alert(t.success, 'Shop profile updated successfully.');
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out from this device?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: async () => {
          await authService.signOut();
          logout();
          resetBusinessSession();
          setProducts([]);
          setCategories([]);
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Sign Out & Reset Session',
      'This will sign you out and clear your current app session. Contact support to permanently delete your cloud shop records.',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            logout();
            resetBusinessSession();
            setProducts([]);
            setCategories([]);
            router.replace('/(auth)/onboarding' as any);
          },
        },
      ]
    );
  };

  if (isRoleLoaded && !canDo('manage_settings')) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  return (
    <View style={styles.container}>
      <Header title={t.settingsTitle} showBack={true} showSettings={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Business Profile Overview Card */}
        <Card radius="xl" shadow="sm" style={styles.profileCard}>
          <View style={styles.shopAvatar}>
            <Store size={26} color={COLORS.primary} />
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{business?.name || 'QuickBill Store'}</Text>
            <Text style={styles.shopOwner}>{business?.ownerName} • {business?.phone}</Text>
            <Text style={styles.shopBadge}>
              {subscription?.plan === 'pro' ? 'Pro Business' : subscription?.plan === 'starter' ? 'Starter Plan' : 'Free Plan'}
            </Text>
          </View>
          <Button
            variant="flat"
            color="primary"
            size="sm"
            radius="md"
            onPress={openShopEditModal}
          >
            Edit
          </Button>
        </Card>

        {/* SECTION 1: Shop & Hardware Settings */}
        <Text style={styles.sectionTitle}>Shop & Device</Text>
        <Card radius="xl" shadow="sm" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(auth)/language' as any)}
          >
            <View style={styles.menuIconBox}>
              <Globe size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.languageSettings}</Text>
              <Text style={styles.menuSub}>Current: English</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={openShopEditModal}>
            <View style={styles.menuIconBox}>
              <Tag size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.taxSettings}</Text>
              <Text style={styles.menuSub}>Default Rate: {business?.defaultTaxRate || 5}% • Inclusive: {business?.taxInclusive ? 'Yes' : 'No'}</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.printerSettings,
                'Bluetooth Thermal Printer: Ready to connect 58mm/80mm ESC/POS hardware.'
              )
            }
          >
            <View style={styles.menuIconBox}>
              <Printer size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.printerSettings}</Text>
              <Text style={styles.menuSub}>ESC/POS 58mm / 80mm wireless printing</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 2: Cloud Sync & Subscription */}
        <Text style={styles.sectionTitle}>Cloud & Subscription</Text>
        <Card radius="xl" shadow="sm" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/subscription' as any)}
          >
            <View style={styles.menuIconBox}>
              <Sparkles size={18} color={COLORS.warning} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.subscriptionManagement}</Text>
              <Text style={styles.menuSub}>
                Plan: {subscription?.plan === 'pro' ? 'Pro Business (Active)' : subscription?.plan === 'starter' ? 'Starter Plan (Active)' : 'Free Tier'}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <RoleGate permission="manage_staff">
            <Divider style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/manage-staff' as any)}
            >
              <View style={styles.menuIconBox}>
                <Users size={18} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{t.staffManagement}</Text>
                <Text style={styles.menuSub}>Add staff logins, suspend access & reset passwords</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </RoleGate>
        </Card>

        {/* SECTION 3: Legal & Support */}
        <Text style={styles.sectionTitle}>Support & Policies</Text>
        <Card radius="xl" shadow="sm" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.privacyPolicy,
                'QuickBill uses encrypted Supabase PostgreSQL cloud storage with Row-Level Security for complete business data isolation.'
              )
            }
          >
            <View style={styles.menuIconBox}>
              <ShieldCheck size={18} color={COLORS.success} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.privacyPolicy}</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/help-support' as any)}
          >
            <View style={styles.menuIconBox}>
              <MessageSquare size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.helpSupport}</Text>
              <Text style={styles.menuSub}>Phone Helpline, Email & Support Tickets</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 4: Account Actions */}
        <Card radius="xl" shadow="sm" style={[styles.menuCard, { marginTop: SPACING.lg }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuIconBox}>
              <LogOut size={18} color={COLORS.error} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: COLORS.error }]}>{t.logout}</Text>
            </View>
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={styles.menuIconBox}>
              <Trash2 size={18} color={COLORS.error} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: COLORS.error }]}>{t.accountDeletion}</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Edit Shop Details Modal */}
      <Modal
        visible={shopEditModal}
        onDismiss={() => setShopEditModal(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>
            {t.editShopDetails}
          </Text>
        </ModalHeader>
        <ModalBody>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input
              label={t.businessName}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.fieldLabel}>Shop Type</Text>
            <View style={styles.typeGrid}>
              {SHOP_TYPES.map((item) => {
                const selected = editBusinessType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.typeChip, selected && styles.typeChipActive]}
                    onPress={() => setEditBusinessType(item.type)}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label={t.ownerName}
              value={editOwnerName}
              onChangeText={setEditOwnerName}
            />

            <Input
              label={t.phone}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Business Email (Optional)"
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t.shopAddress}
              value={editAddress}
              onChangeText={setEditAddress}
              multiline
              numberOfLines={2}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>GST Registered</Text>
              <Switch isSelected={editIsGstRegistered} onValueChange={setEditIsGstRegistered} color="secondary" />
            </View>

            {editIsGstRegistered && (
              <Input
                label={t.gstin}
                value={editGstin}
                onChangeText={(txt) => setEditGstin(txt.toUpperCase())}
                maxLength={15}
                autoCapitalize="characters"
              />
            )}

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label="Default Tax (%)"
                  value={editDefaultTaxRate}
                  onChangeText={setEditDefaultTaxRate}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Invoice Prefix"
                  value={editInvoicePrefix}
                  onChangeText={(txt) => setEditInvoicePrefix(txt.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Prices Include GST</Text>
              <Switch isSelected={taxInclusive} onValueChange={setTaxInclusive} color="secondary" />
            </View>

            <Button
              color="primary"
              size="lg"
              radius="md"
              fullWidth
              isLoading={isSavingShop}
              style={styles.saveBtn}
              onPress={handleSaveShopDetails}
            >
              {t.save} Changes
            </Button>
          </ScrollView>
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
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  shopAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  shopOwner: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  shopBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    marginLeft: 4,
    marginTop: SPACING.sm,
  },
  menuCard: {
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  menuDivider: {
    marginLeft: 50,
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryContainer,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
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
  saveBtn: {
    marginTop: SPACING.md,
  },
});
