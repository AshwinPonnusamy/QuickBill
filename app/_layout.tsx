import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppPaperTheme } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { authService } from '../services/auth.service';
import { businessService } from '../services/business.service';
import { productService } from '../services/product.service';
import { forceLogoutSuspendedUser } from '../services/sessionGuard';

export default function RootLayout() {
  const { setAuth, setLanguage, setHydrated, logout } = useAuthStore();
  const { setBusiness, setSubscription, setRole, resetBusinessSession } = useBusinessStore();
  const { setProducts, setCategories } = useProductStore();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const applyImmersiveNavBar = () => {
      try {
        NavigationBar.setHidden(true);
        NavigationBar.setStyle('dark');
      } catch {
        // Ignore if running in an environment where native module is unavailable
      }
    };

    applyImmersiveNavBar();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        applyImmersiveNavBar();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateUserSession(user: any) {
      if (!user) {
        if (!isMounted) return;
        logout();
        resetBusinessSession();
        setProducts([]);
        setCategories([]);
        return;
      }

      const profile = await authService.ensureProfile(user);
      if (!isMounted) return;
      setAuth(user, profile);

      const biz = await businessService.getBusiness(user.id);
      if (!isMounted) return;

      if (!biz) {
        const suspended = await businessService.isUserSuspended(user.id);
        if (!isMounted) return;
        if (suspended) {
          await forceLogoutSuspendedUser('Your staff account has been suspended by the shop owner.');
          return;
        }
        resetBusinessSession();
        setProducts([]);
        setCategories([]);
        return;
      }

      if (biz.ownerId !== user.id) {
        const status = await businessService.getMembershipStatus(biz.id, user.id);
        if (!isMounted) return;
        if (status !== 'active') {
          await forceLogoutSuspendedUser('Your staff membership is suspended or no longer active.');
          return;
        }
      }

      const role = await businessService.getMyRole(biz.id, user.id);
      if (!isMounted) return;
      setBusiness(biz);
      setRole(role);

      const [sub, prods, cats] = await Promise.all([
        businessService.getSubscription(biz.id),
        productService.getProducts(biz.id),
        productService.getCategories(biz.id),
      ]);
      if (!isMounted) return;
      setSubscription(sub);
      setProducts(prods);
      setCategories(cats);
    }

    async function bootstrap() {
      try {
        const savedLang = await AsyncStorage.getItem('qb_language');
        if (savedLang === 'en' && isMounted) {
          setLanguage(savedLang);
        }

        if (!isSupabaseConfigured()) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        await hydrateUserSession(session?.user || null);
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    }

    bootstrap();

    if (!isSupabaseConfigured()) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateUserSession(session?.user || null).catch(console.error);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <PaperProvider theme={AppPaperTheme}>
      <StatusBar style="light" />
      {Platform.OS === 'android' ? <NavigationBar hidden style="dark" /> : null}
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
        <Stack.Screen name="manage-staff" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="help-support" />
      </Stack>
    </PaperProvider>
  );
}
