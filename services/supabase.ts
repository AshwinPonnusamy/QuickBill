import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy';

const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

// Read EXPO_PUBLIC_* statically so Metro inlines them at build time,
// and fall back to app.json extra config so runtime builds always resolve.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || PLACEHOLDER_URL;
const SUPABASE_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabasePublishableKey ||
  PLACEHOLDER_KEY;

/**
 * Checks whether a real Supabase URL and client-safe public key are configured.
 * Rejects placeholder values and accidentally supplied secret keys.
 */
export const isSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabasePublishableKey;

  return (
    typeof url === 'string' &&
    url.length > 0 &&
    url !== PLACEHOLDER_URL &&
    typeof key === 'string' &&
    key.length > 0 &&
    key !== PLACEHOLDER_KEY &&
    !key.startsWith('sb_secret_')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
