import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Surface, Switch, Button, Modal, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { authService } from '../services/auth.service';
import { businessService } from '../services/business.service';
import { syncService } from '../services/sync.service';
import { TRANSLATIONS } from '../constants/translations';

export default function SettingsScreen() {
  const router = useRouter();
  const { language, setLanguage, logout } = useAuthStore();
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
        <Surface style={styles.profileCard} elevation={1}>
          <View style={styles.shopAvatar}>
            <Text style={styles.shopAvatarIcon}>🏪</Text>
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{business?.name || 'QuickBill Store'}</Text>
            <Text style={styles.shopOwner}>{business?.ownerName} • {business?.phone}</Text>
            <Text style={styles.shopBadge}>
              {subscription?.plan === 'pro' ? '⭐ Pro Plan' : 'Free Plan'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShopEditModal(true)} style={styles.editShopBtn}>
            <Text style={styles.editShopText}>Edit</Text>
          </TouchableOpacity>
        </Surface>

        {/* SECTION 1: Shop & Hardware Settings */}
        <Text style={styles.sectionTitle}>Shop & Device</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(auth)/language' as any)}
          >
            <Text style={styles.menuIcon}>🌐</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.languageSettings}</Text>
              <Text style={styles.menuSub}>Current: English</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setShopEditModal(true)}>
            <Text style={styles.menuIcon}>🏷️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.taxSettings}</Text>
              <Text style={styles.menuSub}>Default Rate: {business?.defaultTaxRate || 5}% • Inclusive: {business?.taxInclusive ? 'Yes' : 'No'}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.printerSettings,
                'Bluetooth Thermal Printer: Ready to connect 58mm/80mm ESC/POS hardware.'
              )
            }
          >
            <Text style={styles.menuIcon}>🖨️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.printerSettings}</Text>
              <Text style={styles.menuSub}>ESC/POS 58mm / 80mm wireless printing</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </Surface>

        {/* SECTION 2: Cloud Sync & Subscription */}
        <Text style={styles.sectionTitle}>Cloud & Subscription</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/subscription' as any)}
          >
            <Text style={styles.menuIcon}>⭐</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.subscriptionManagement}</Text>
              <Text style={styles.menuSub}>
                Plan: {subscription?.plan === 'pro' ? 'Pro Business (Active)' : 'Free Tier'}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleManualSync} disabled={syncing}>
            <Text style={styles.menuIcon}>🔄</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.backupSync}</Text>
              <Text style={styles.menuSub}>
                {syncing ? 'Synchronizing with Supabase...' : 'Trigger manual cloud sync'}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.staffManagement,
                `Role: Owner (${business?.ownerName}). Multi-staff permission management is enabled on Pro Plan.`
              )
            }
          >
            <Text style={styles.menuIcon}>👥</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.staffManagement}</Text>
              <Text style={styles.menuSub}>Roles: Owner, Admin, Cashier</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </Surface>

        {/* SECTION 3: Legal & Support */}
        <Text style={styles.sectionTitle}>Support & Policies</Text>
        <Surface style={styles.menuCard} elevation={1}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.privacyPolicy,
                'QuickBill stores all billing records locally on device and uses encrypted Supabase PostgreSQL storage with Row-Level Security for business data isolation.'
              )
            }
          >
            <Text style={styles.menuIcon}>🛡️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.privacyPolicy}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                t.helpSupport,
                'QuickBill Support:\nEmail: support@quickbill.in\nWhatsApp: +91 98400 00000\nHelpline hours: 9 AM - 9 PM IST'
              )
            }
          >
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{t.helpSupport}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </Surface>

        {/* SECTION 4: Account Actions */}
        <Surface style={[styles.menuCard, { marginTop: SPACING.lg }]} elevation={1}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuIcon}>🚪</Text>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: COLORS.error }]}>{t.logout}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: COLORS.error }]}>{t.accountDeletion}</Text>
            </View>
          </TouchableOpacity>
        </Surface>
      </ScrollView>

      {/* Edit Shop Details Modal */}
      <Portal>
        <Modal
          visible={shopEditModal}
          onDismiss={() => setShopEditModal(false)}
          contentContainerStyle={styles.modalBox}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t.editShopDetails}
          </Text>

          <TextInput
            label={t.businessName}
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label={t.phone}
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label={t.shopAddress}
            value={editAddress}
            onChangeText={setEditAddress}
            multiline
            numberOfLines={2}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label={t.gstin}
            value={editGstin}
            onChangeText={(txt) => setEditGstin(txt.toUpperCase())}
            mode="outlined"
            style={styles.modalInput}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Prices Include GST</Text>
            <Switch value={taxInclusive} onValueChange={setTaxInclusive} color={COLORS.secondary} />
          </View>

          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            style={styles.saveBtn}
            onPress={handleSaveShopDetails}
          >
            {t.save} Changes
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
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  shopAvatarIcon: {
    fontSize: 22,
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
  editShopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.surfaceVariant,
  },
  editShopText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuIcon: {
    fontSize: 20,
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
  arrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50,
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
    borderRadius: ROUNDNESS.md,
  },
});

