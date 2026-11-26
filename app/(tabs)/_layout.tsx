import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Home, Receipt, Plus, Package, BarChart3 } from '../../components/common/Icons';
import { COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { TRANSLATIONS } from '../../constants/translations';
import { useCan } from '../../utils/permissions';

export default function TabsLayout() {
  const { language, isAuthenticated, isHydrated } = useAuthStore(
    useShallow((s) => ({
      language: s.language,
      isAuthenticated: s.isAuthenticated,
      isHydrated: s.isHydrated,
    }))
  );
  const { business, isRoleLoaded } = useBusinessStore(
    useShallow((s) => ({
      business: s.business,
      isRoleLoaded: s.isRoleLoaded,
    }))
  );
  const canDo = useCan();
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10);

  if (isHydrated && !isAuthenticated) {
    return <Redirect href={'/(auth)/login' as any} />;
  }

  if (isHydrated && isAuthenticated && !business) {
    return <Redirect href={'/business-setup' as any} />;
  }

  // Wait until DB role is resolved so restricted tabs never flash
  if (!isRoleLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading workspace permissions...</Text>
      </View>
    );
  }

  const canViewReports = canDo('view_reports');
  const canViewAllInvoices = canDo('view_all_invoices');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 66 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          overflow: 'visible',
          shadowColor: COLORS.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarItemStyle: {
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          href: canViewReports ? undefined : null,
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="bills"
        options={{
          title: canViewAllInvoices ? t.tabBills : 'My Bills',
          tabBarIcon: ({ color, size }) => <Receipt size={size || 22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="new-bill"
        options={{
          title: t.tabNewBill,
          tabBarIconStyle: {
            width: 44,
            height: 28,
            overflow: 'visible',
          },
          tabBarIcon: () => (
            <View style={styles.newBillBtn}>
              <Plus size={22} color={COLORS.white} strokeWidth={2.5} />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={[styles.newBillLabel, focused && styles.activeNewBillLabel]}
            >
              {t.tabNewBill}
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: t.tabProducts,
          tabBarIcon: ({ color, size }) => <Package size={size || 22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabReports,
          href: canViewReports ? undefined : null,
          tabBarIcon: ({ color, size }) => <BarChart3 size={size || 22} color={color as string} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  newBillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  newBillLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    fontWeight: '700',
    color: COLORS.secondary,
    zIndex: 10,
  },
  activeNewBillLabel: {
    color: COLORS.primary,
  },
});
