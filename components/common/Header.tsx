import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft, Settings, User, Users, LogOut } from './Icons';
import { QuickBillLogo } from './QuickBillLogo';
import { Button, Modal, ModalHeader, ModalBody, Badge, Divider } from '../heroui';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { useProductStore } from '../../store/product.store';
import { useBillStore } from '../../store/bill.store';
import { authService } from '../../services/auth.service';
import { TRANSLATIONS } from '../../constants/translations';
import { useCan, RoleGate } from '../../utils/permissions';
import { safeGoBack } from '../../utils/navigation';
import { UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff Cashier',
};

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showSettings = true,
}) => {
  const router = useRouter();
  const { language, profile, logout } = useAuthStore(
    useShallow((s) => ({
      language: s.language,
      profile: s.profile,
      logout: s.logout,
    }))
  );
  const { business, role, isRoleLoaded, resetBusinessSession } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      role: s.role,
      isRoleLoaded: s.isRoleLoaded,
      resetBusinessSession: s.resetBusinessSession,
    }))
  );
  const { setProducts, setCategories } = useProductStore(
    useShallow((s) => ({
      setProducts: s.setProducts,
      setCategories: s.setCategories,
    }))
  );
  const clearBill = useBillStore((s) => s.clearBill);
  const canDo = useCan();
  const t = TRANSLATIONS[language];

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out from this device?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await authService.signOut();
            logout();
            resetBusinessSession();
            setProducts([]);
            setCategories([]);
            clearBill();
            setProfileModalVisible(false);
            router.replace('/(auth)/login' as any);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const roleLabel = isRoleLoaded ? ROLE_LABELS[role] || 'Staff' : 'Loading';

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandBadge}>
            <QuickBillLogo size={34} />
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || business?.name || t.appName}
          </Text>
          {subtitle || business?.ownerName ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle || business?.ownerName || t.tagline}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!canDo('manage_settings') ? (
            <TouchableOpacity
              onPress={() => setProfileModalVisible(true)}
              style={styles.rolePillBtn}
            >
              <User size={14} color={COLORS.white} />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </TouchableOpacity>
          ) : null}

          {!canDo('manage_settings') && canDo('manage_staff') ? (
            <TouchableOpacity
              onPress={() => router.push('/manage-staff' as any)}
              style={styles.iconBtn}
            >
              <Users size={18} color={COLORS.white} />
            </TouchableOpacity>
          ) : null}

          {showSettings ? (
            <RoleGate permission="manage_settings">
              <TouchableOpacity
                onPress={() => router.push('/settings' as any)}
                style={styles.iconBtn}
              >
                <Settings size={20} color={COLORS.white} />
              </TouchableOpacity>
            </RoleGate>
          ) : null}
        </View>
      </View>

      {/* Staff / Member Profile & Logout Modal */}
      <Modal
        visible={profileModalVisible}
        onDismiss={() => setProfileModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>Account Profile</Text>
        </ModalHeader>
        <ModalBody>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <User size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.fullName || 'Team Member'}</Text>
              <Text style={styles.profileMeta}>
                {profile?.phone || 'No phone on profile'}
              </Text>
            </View>
            <Badge color="secondary" variant="flat" size="sm">
              {roleLabel}
            </Badge>
          </View>

          <Divider style={{ marginVertical: SPACING.md }} />

          <View style={styles.shopMetaRow}>
            <Text style={styles.shopMetaLabel}>Shop</Text>
            <Text style={styles.shopMetaVal}>{business?.name || 'QuickBill Store'}</Text>
          </View>
          <View style={styles.shopMetaRow}>
            <Text style={styles.shopMetaLabel}>Access Level</Text>
            <Text style={styles.shopMetaVal}>{roleLabel}</Text>
          </View>

          <Button
            color="danger"
            variant="flat"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isLoggingOut}
            startContent={<LogOut size={18} color={COLORS.error} />}
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            Sign Out
          </Button>
        </ModalBody>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 14,
    paddingHorizontal: SPACING.base,
    borderBottomLeftRadius: ROUNDNESS.lg,
    borderBottomRightRadius: ROUNDNESS.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingRight: SPACING.md,
  },
  brandBadge: {
    marginRight: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBtn: {
    padding: 8,
    borderRadius: ROUNDNESS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  rolePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  rolePillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  shopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  shopMetaLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shopMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  logoutBtn: {
    marginTop: SPACING.md,
  },
});
