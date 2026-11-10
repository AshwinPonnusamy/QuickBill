import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';

export default function TabsLayout() {
  const { language } = useAuthStore();
  const t = TRANSLATIONS[language];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />

      <Tabs.Screen
        name="bills"
        options={{
          title: t.tabBills,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🧾</Text>,
        }}
      />

      <Tabs.Screen
        name="new-bill"
        options={{
          title: t.newBill,
          tabBarIcon: ({ focused }) => (
            <View style={styles.newBillBtn}>
              <Text style={styles.newBillIcon}>➕</Text>
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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: t.tabReports,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  newBillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  newBillIcon: {
    fontSize: 20,
    color: COLORS.white,
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

