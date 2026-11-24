import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Home, Receipt, Plus, Package, BarChart3 } from '../../components/common/Icons';
import { COLORS, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';

export default function TabsLayout() {
  const { language } = useAuthStore();
  const t = TRANSLATIONS[language];

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
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          shadowColor: COLORS.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
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
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="bills"
        options={{
          title: t.tabBills,
          tabBarIcon: ({ color, size }) => <Receipt size={size || 22} color={color as string} />,
        }}
      />

      <Tabs.Screen
        name="new-bill"
        options={{
          title: t.newBill,
          tabBarIcon: ({ focused }) => (
            <View style={styles.newBillBtn}>
              <Plus size={24} color={COLORS.white} strokeWidth={2.5} />
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.newBillLabel, focused && styles.activeNewBillLabel]}>
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
          tabBarIcon: ({ color, size }) => <BarChart3 size={size || 22} color={color as string} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  newBillBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  newBillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  activeNewBillLabel: {
    color: COLORS.primary,
  },
});
