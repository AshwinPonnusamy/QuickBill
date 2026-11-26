import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Text,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import {
  Button,
  Card,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  Badge,
  Divider,
} from '../components/heroui';
import { Header } from '../components/common/Header';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { staffService } from '../services/staff.service';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { useCan, RoleGate } from '../utils/permissions';
import { BusinessMember, UserRole } from '../types';
import {
  Users,
  Plus,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  ShieldCheck,
} from '../components/common/Icons';

const ROLE_DISPLAY: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
};

export default function ManageStaffScreen() {
  const router = useRouter();
  const { language, user } = useAuthStore(
    useShallow((s) => ({
      language: s.language,
      user: s.user,
    }))
  );
  const { business, subscription, isRoleLoaded, setSubscription } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      subscription: s.subscription,
      isRoleLoaded: s.isRoleLoaded,
      setSubscription: s.setSubscription,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];
  const canManageStaff = canDo('manage_staff');

  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add Staff modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Reset Password modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTarget, setResetTarget] = useState<BusinessMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Per-member busy flag
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!business || !canManageStaff) return;
    setLoadError(null);
    try {
      const [staffRes, sub] = await Promise.all([
        staffService.listStaff(business.id),
        businessService.getSubscription(business.id),
      ]);
      if (staffRes.error) {
        setLoadError(staffRes.error);
      } else {
        setMembers(staffRes.staff);
      }
      if (sub) setSubscription(sub);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business, canManageStaff]);

  useEffect(() => {
    if (!business || !canManageStaff) return;
    let cancelled = false;
    Promise.all([
      staffService.listStaff(business.id),
      businessService.getSubscription(business.id),
    ])
      .then(([staffRes, sub]) => {
        if (cancelled) return;
        if (staffRes.error) {
          setLoadError(staffRes.error);
        } else {
          setLoadError(null);
          setMembers(staffRes.staff);
        }
        if (sub) setSubscription(sub);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [business, canManageStaff, setSubscription]);

  if (isRoleLoaded && !canManageStaff) {
    return <Redirect href={'/(tabs)/new-bill' as any} />;
  }

  const maxSeats = subscription?.maxStaff ?? 1;
  const activeSeatsUsed = members.filter((m) => m.status !== 'suspended').length;
  const isAtSeatLimit = activeSeatsUsed >= maxSeats;
  const staffOnlyMembers = members.filter((m) => m.userId !== business?.ownerId);

  const handleOpenAddModal = () => {
    if (isAtSeatLimit) {
      if (canDo('manage_subscription')) {
        Alert.alert(
          'Staff Limit Reached',
          `Your current plan supports up to ${maxSeats} active team ${maxSeats === 1 ? 'member' : 'members'} (including owner). Upgrade your plan to add staff logins.`,
          [
            { text: t.cancel, style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/subscription' as any) },
          ]
        );
      } else {
        Alert.alert(
          'Staff Limit Reached',
          'Your shop plan has reached its staff limit. Ask the shop owner to upgrade the subscription.'
        );
      }
      return;
    }
    setFullName('');
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setAddModalVisible(true);
  };

  const handleCreateStaff = async () => {
    if (!business) return;
    if (!fullName.trim()) {
      Alert.alert(t.error, 'Please enter the staff member name.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert(t.error, 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.error, 'Password must be at least 6 characters.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await staffService.createStaff(business.id, {
        fullName: fullName.trim(),
        phone: digits,
        password,
      });

      if (!res.success) {
        if (res.error?.toLowerCase().includes('limit reached') && canDo('manage_subscription')) {
          Alert.alert('Staff Limit Reached', res.error, [
            { text: t.cancel, style: 'cancel' },
            { text: 'Upgrade Plan', onPress: () => router.push('/subscription' as any) },
          ]);
        } else {
          Alert.alert(t.error, res.error || 'Could not create staff login. Please retry.');
        }
        return;
      }

      setAddModalVisible(false);
      Alert.alert(
        t.success,
        `Staff login created for ${fullName.trim()}. They can now sign in with ${digits} and their password.`
      );
      loadData();
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = (member: BusinessMember) => {
    if (!business) return;
    const nextStatus = member.status === 'suspended' ? 'active' : 'suspended';
    const memberName = member.profile?.fullName || 'this staff member';

    if (nextStatus === 'active' && isAtSeatLimit) {
      Alert.alert(
        'Staff Limit Reached',
        `Your plan allows ${maxSeats} active team ${maxSeats === 1 ? 'member' : 'members'}. Suspend another member or upgrade your plan first.`
      );
      return;
    }

    Alert.alert(
      nextStatus === 'suspended' ? 'Suspend Staff Access' : 'Reactivate Staff Access',
      nextStatus === 'suspended'
        ? `Suspend ${memberName}? They will be blocked from creating bills immediately.`
        : `Reactivate ${memberName} so they can log in and create bills again?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: nextStatus === 'suspended' ? 'Suspend' : 'Activate',
          style: nextStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            setBusyMemberId(member.id);
            try {
              const res = await staffService.setStaffStatus(business.id, member.id, nextStatus);
              if (!res.success) {
                Alert.alert(t.error, res.error || 'Failed to update status.');
                return;
              }
              setMembers((prev) =>
                prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m))
              );
            } finally {
              setBusyMemberId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenResetModal = (member: BusinessMember) => {
    setResetTarget(member);
    setNewPassword('');
    setShowResetPassword(false);
    setResetModalVisible(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!business || !resetTarget) return;
    if (newPassword.length < 6) {
      Alert.alert(t.error, 'New password must be at least 6 characters.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await staffService.resetStaffPassword(
        business.id,
        resetTarget.userId,
        newPassword
      );
      if (!res.success) {
        Alert.alert(t.error, res.error || 'Could not reset password.');
        return;
      }
      setResetModalVisible(false);
      Alert.alert(
        t.success,
        `Password updated for ${resetTarget.profile?.fullName || 'staff member'}.`
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleRemoveStaff = (member: BusinessMember) => {
    if (!business) return;
    const memberName = member.profile?.fullName || 'this staff member';
    Alert.alert(
      'Remove Staff Member',
      `Remove ${memberName} from ${business.name}? They will immediately lose access to this shop.`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyMemberId(member.id);
            try {
              const res = await staffService.removeStaff(business.id, member.id);
              if (!res.success) {
                Alert.alert(t.error, res.error || 'Failed to remove staff member.');
                return;
              }
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
            } finally {
              setBusyMemberId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t.staffManagement} showBack={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadData();
            }}
          />
        }
      >
        {/* Plan Capacity Summary Card */}
        <Card radius="xl" shadow="sm" style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Team Seats</Text>
              <Text style={styles.summaryCount}>
                {activeSeatsUsed} of {maxSeats} {maxSeats === 1 ? 'seat' : 'seats'} used
              </Text>
              <Text style={styles.summarySub}>
                Includes shop owner. Staff can create bills and view only their own bills.
              </Text>
            </View>
            <Button
              color={isAtSeatLimit ? 'default' : 'primary'}
              variant={isAtSeatLimit ? 'bordered' : 'solid'}
              size="md"
              radius="md"
              startContent={<Plus size={16} color={isAtSeatLimit ? COLORS.textSecondary : COLORS.white} />}
              onPress={handleOpenAddModal}
            >
              Add Staff
            </Button>
          </View>

          {isAtSeatLimit ? (
            <View style={styles.upgradeBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Staff limit reached on current plan</Text>
                <Text style={styles.upgradeSub}>
                  {maxSeats <= 1
                    ? 'Free plan supports owner only. Upgrade to Starter or Pro to add staff cashiers.'
                    : 'Upgrade to Pro to add more staff cashiers for your store.'}
                </Text>
              </View>
              <RoleGate permission="manage_subscription">
                <Button
                  color="secondary"
                  size="sm"
                  radius="md"
                  startContent={<Sparkles size={14} color={COLORS.white} />}
                  onPress={() => router.push('/subscription' as any)}
                >
                  Upgrade
                </Button>
              </RoleGate>
            </View>
          ) : null}
        </Card>

        {/* Loading / Error / Staff List */}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading team members...</Text>
          </View>
        ) : loadError ? (
          <Card radius="lg" shadow="sm" style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load team members</Text>
            <Text style={styles.errorSub}>{loadError}</Text>
            <Button color="primary" size="sm" radius="md" onPress={loadData} style={{ marginTop: SPACING.sm }}>
              Retry
            </Button>
          </Card>
        ) : (
          <>
            {/* Owner / Current Team Header */}
            <Text style={styles.sectionLabel}>Active Team ({members.length})</Text>

            {members.map((member) => {
              const isSelf = member.userId === user?.id;
              const isOwnerRecord = member.userId === business?.ownerId;
              const isSuspended = member.status === 'suspended';
              const isBusy = busyMemberId === member.id;
              const displayName = member.profile?.fullName || (isOwnerRecord ? business?.ownerName : 'Staff Member');
              const displayPhone = member.profile?.phone || 'No mobile number';

              return (
                <Card key={member.id} radius="lg" shadow="sm" style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <View style={styles.memberAvatar}>
                      {isOwnerRecord ? (
                        <ShieldCheck size={20} color={COLORS.primary} />
                      ) : (
                        <Users size={20} color={COLORS.secondary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>
                        {displayName} {isSelf ? '(You)' : ''}
                      </Text>
                      <View style={styles.phoneRow}>
                        <Phone size={12} color={COLORS.textSecondary} />
                        <Text style={styles.memberPhone}>{displayPhone}</Text>
                      </View>
                    </View>
                    <View style={styles.badgesCol}>
                      <Badge
                        color={isOwnerRecord ? 'primary' : 'default'}
                        variant="flat"
                        size="sm"
                      >
                        {ROLE_DISPLAY[member.role] || 'Staff'}
                      </Badge>
                      <Badge
                        color={isSuspended ? 'danger' : 'success'}
                        variant="flat"
                        size="sm"
                      >
                        {member.status.toUpperCase()}
                      </Badge>
                    </View>
                  </View>

                  {!isOwnerRecord && !isSelf ? (
                    <>
                      <Divider style={{ marginVertical: SPACING.sm }} />
                      <View style={styles.memberActions}>
                        <Button
                          variant="flat"
                          color={isSuspended ? 'success' : 'warning'}
                          size="sm"
                          radius="sm"
                          isDisabled={isBusy}
                          onPress={() => handleToggleStatus(member)}
                        >
                          {isSuspended ? 'Activate' : 'Suspend'}
                        </Button>

                        <Button
                          variant="flat"
                          color="primary"
                          size="sm"
                          radius="sm"
                          isDisabled={isBusy}
                          startContent={<Lock size={13} color={COLORS.primary} />}
                          onPress={() => handleOpenResetModal(member)}
                        >
                          Reset Password
                        </Button>

                        <Button
                          variant="light"
                          color="danger"
                          size="sm"
                          radius="sm"
                          isDisabled={isBusy}
                          startContent={<Trash2 size={13} color={COLORS.error} />}
                          onPress={() => handleRemoveStaff(member)}
                        >
                          Remove
                        </Button>
                      </View>
                    </>
                  ) : null}
                </Card>
              );
            })}

            {staffOnlyMembers.length === 0 ? (
              <Card radius="lg" shadow="sm" style={styles.emptyCard}>
                <Users size={36} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>No staff logins added yet</Text>
                <Text style={styles.emptySub}>
                  Create staff accounts so cashiers can log in on their own phones and create bills only.
                </Text>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Modal 1: Add Staff Login */}
      <Modal
        visible={addModalVisible}
        onDismiss={() => setAddModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>Add Staff Cashier</Text>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.modalHint}>
            Staff members sign in using their 10-digit mobile number and password. They can only create bills and view their own bills.
          </Text>

          <Input
            label="Full Name *"
            placeholder="e.g. Karthik R"
            value={fullName}
            onChangeText={setFullName}
          />

          <Input
            label="Mobile Number *"
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            startContent={<Phone size={16} color={COLORS.textMuted} />}
          />

          <Input
            label="Password (min 6 characters) *"
            placeholder="Create login password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            startContent={<Lock size={16} color={COLORS.textMuted} />}
            endContent={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={COLORS.textMuted} />
                ) : (
                  <Eye size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            }
          />

          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isCreating}
            style={styles.submitBtn}
            onPress={handleCreateStaff}
          >
            Create Staff Login
          </Button>
        </ModalBody>
      </Modal>

      {/* Modal 2: Reset Staff Password */}
      <Modal
        visible={resetModalVisible}
        onDismiss={() => setResetModalVisible(false)}
        contentContainerStyle={styles.modalBox}
      >
        <ModalHeader>
          <Text style={styles.modalTitle}>Reset Password</Text>
        </ModalHeader>
        <ModalBody>
          <Text style={styles.modalHint}>
            Set a new login password for {resetTarget?.profile?.fullName || 'this staff member'}.
          </Text>

          <Input
            label="New Password *"
            placeholder="Minimum 6 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showResetPassword}
            startContent={<Lock size={16} color={COLORS.textMuted} />}
            endContent={
              <TouchableOpacity onPress={() => setShowResetPassword(!showResetPassword)}>
                {showResetPassword ? (
                  <EyeOff size={18} color={COLORS.textMuted} />
                ) : (
                  <Eye size={18} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            }
          />

          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isResetting}
            style={styles.submitBtn}
            onPress={handleConfirmResetPassword}
          >
            Save New Password
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
  summaryCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  summarySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.secondaryContainer,
  },
  upgradeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  upgradeSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    marginLeft: 2,
  },
  memberCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  centerBox: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  errorCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  errorSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBox: {
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 18,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
});
