import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AppPaperTheme } from '../constants/theme';
import { initDatabase } from '../database/sqlite';
import { syncService } from '../services/sync.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { authService } from '../services/auth.service';
import { businessService } from '../services/business.service';

export default function RootLayout() {
  const { setAuth, setLanguage } = useAuthStore();
  const { setBusiness, setSubscription } = useBusinessStore();

  useEffect(() => {
    async function bootstrap() {
      await initDatabase();

      const savedLang = await AsyncStorage.getItem('qb_language');
      if (savedLang === 'en') {
        setLanguage(savedLang);
      }

      const cachedUser = await AsyncStorage.getItem('qb_demo_user');
      if (cachedUser) {
        const profile = JSON.parse(cachedUser);
        setAuth({ id: profile.id, email: profile.phone }, profile);
      }

      const cachedBiz = await AsyncStorage.getItem('qb_active_business');
      if (cachedBiz) {
        const biz = JSON.parse(cachedBiz);
        setBusiness(biz);
        const sub = await businessService.getSubscription(biz.id);
        setSubscription(sub);
      }

      syncService.processSyncQueue().catch(console.error);
    }

    bootstrap();

    const interval = setInterval(() => {
      syncService.processSyncQueue().catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <PaperProvider theme={AppPaperTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="business-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bill-review" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="receipt-preview" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="customers" />
      </Stack>
    </PaperProvider>
  );
}
