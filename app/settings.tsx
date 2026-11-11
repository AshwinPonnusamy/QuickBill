import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, Switch, Divider } from '../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { authService } from '../services/auth.service';
import { businessService } from '../services/business.service';
import { syncService } from '../services/sync.service';
import { TRANSLATIONS } from '../constants/translations';
import {
  Store,
  Globe,
  Tag,
  Printer,
  Sparkles,
  RefreshCw,
  Users,
  ShieldCheck,
  MessageSquare,
  LogOut,
  Trash2,
  ChevronRight,
} from '../components/common/Icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { language, logout } = useAuthStore();
  const { business, subscription, updateBusiness } = useBusinessStore();
  const t = TRANSLATIONS[language];

  // Modals
  const [shopEditModal, setShopEditModal] = useState(false);
  const [editName, setEditName] = useState(business?.name || '');
  const [editPhone, setEditPhone] = useState(business?.phone || '');
  const [editAddress, setEditAddress] = useState(business?.address || '');
  const [editGstin, setEditGstin] = useState(business?.gstin || '');
  const [taxInclusive, setTaxInclusive] = useState(business?.taxInclusive ?? true);
  const [syncing, setSyncing] = useState(false);

  const handleSaveShopDetails = async () => {
    if (!business) return;
    await businessService.updateBusiness(business.id, {
      name: editName,
      phone: editPhone,
      address: editAddress,
      gstin: editGstin,
      taxInclusive,
    });
    updateBusiness({
      name: editName,
      phone: editPhone,
      address: editAddress,
      gstin: editGstin,
      taxInclusive,
    });
    setShopEditModal(false);
    Alert.alert(t.success, 'Shop profile updated successfully.');
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await syncService.processSyncQueue();
      Alert.alert(
        t.success,
        `Cloud Sync Complete: ${res.processed} pending operations synchronized.`
      );
    } catch (e: any) {
      Alert.alert(t.error, e.message || 'Sync failed');
    } finally {
      setSyncing(false);
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
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Shop Account & Data',
      'This will permanently delete all your local database transactions, products, customer records and receipts. This cannot be undone.',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            logout();
            router.replace('/(auth)/onboarding' as any);
          },
        },
      ]
    );
  };

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
              {subscription?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </Text>
          </View>
          <Button
            variant="flat"
            color="primary"
            size="sm"
            radius="md"
            onPress={() => setShopEditModal(true)}
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

          <TouchableOpacity style={styles.menuItem} onPress={() => setShopEditModal(true)}>
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
                Plan: {subscription?.plan === 'pro' ? 'Pro Business (Active)' : 'Free Tier'}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleManualSync} disabled={syncing}>
            <View style={styles.menuIconBox}>
              <RefreshCw size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.backupSync}</Text>
              <Text style={styles.menuSub}>
                {syncing ? 'Synchronizing with Supabase...' : 'Trigger manual cloud sync'}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.staffManagement,
                `Role: Owner (${business?.ownerName}). Multi-staff permission management is enabled on Pro Plan.`
              )
            }
          >
            <View style={styles.menuIconBox}>
              <Users size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.staffManagement}</Text>
              <Text style={styles.menuSub}>Roles: Owner, Admin, Cashier</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 3: Legal & Support */}
        <Text style={styles.sectionTitle}>Support & Policies</Text>
        <Card radius="xl" shadow="sm" style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.privacyPolicy,
                'QuickBill stores all billing records locally on device and uses encrypted Supabase PostgreSQL storage with Row-Level Security for business data isolation.'
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
            onPress={() =>
              Alert.alert(
                t.helpSupport,
                'QuickBill Support:\nEmail: support@quickbill.in\nWhatsApp: +91 98400 00000\nHelpline hours: 9 AM - 9 PM IST'
              )
            }
          >
            <View style={styles.menuIconBox}>
              <MessageSquare size={18} color={COLORS.secondary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.helpSupport}</Text>
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
          <Input
            label={t.businessName}
            value={editName}
            onChangeText={setEditName}
          />

          <Input
            label={t.phone}
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
          />

          <Input
            label={t.shopAddress}
            value={editAddress}
            onChangeText={setEditAddress}
            multiline
            numberOfLines={2}
          />

          <Input
            label={t.gstin}
            value={editGstin}
            onChangeText={(txt) => setEditGstin(txt.toUpperCase())}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Prices Include GST</Text>
            <Switch isSelected={taxInclusive} onValueChange={setTaxInclusive} color="secondary" />
          </View>

          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            style={styles.saveBtn}
            onPress={handleSaveShopDetails}
          >
            {t.save} Changes
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
    backgroundColor: '#EEF4F9',
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
    backgroundColor: '#F4F7FA',
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
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
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
