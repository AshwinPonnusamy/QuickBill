import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, SupportedLanguage } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  /**
   * Login with email or phone + password
   */
  async signIn(emailOrPhone: string, password: string):Promise<{ user: any; profile: Profile | null; error?: string }> {
    const formattedEmail = emailOrPhone.includes('@') 
      ? emailOrPhone.trim().toLowerCase() 
      : `${emailOrPhone.replace(/\D/g, '')}@quickbill.local`;

    if (!isSupabaseConfigured()) {
      // Offline/Demo fallback account
      const demoProfile: Profile = {
        id: 'usr-demo-001',
        fullName: 'Murugan Store Owner',
        phone: emailOrPhone.replace('@quickbill.local', ''),
        preferredLanguage: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('qb_demo_user', JSON.stringify(demoProfile));
      return { user: { id: demoProfile.id, email: formattedEmail }, profile: demoProfile };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error) return { user: null, profile: null, error: error.message };

      // Fetch profile
      const profile = await this.getProfile(data.user.id);
      return { user: data.user, profile };
    } catch (err: any) {
      return { user: null, profile: null, error: err.message || 'Login failed' };
    }
  },

  /**
   * Sign up new user and initialize profile
   */
  async signUp(
    emailOrPhone: string,
    password: string,
    fullName: string,
    language: SupportedLanguage = 'en'
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    const formattedEmail = emailOrPhone.includes('@') 
      ? emailOrPhone.trim().toLowerCase() 
      : `${emailOrPhone.replace(/\D/g, '')}@quickbill.local`;

    if (!isSupabaseConfigured()) {
      const demoProfile: Profile = {
        id: `usr-${Date.now()}`,
        fullName,
        phone: emailOrPhone,
        preferredLanguage: language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('qb_demo_user', JSON.stringify(demoProfile));
      return { user: { id: demoProfile.id, email: formattedEmail }, profile: demoProfile };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          data: { full_name: fullName, preferred_language: language },
        },
      });

      if (error) return { user: null, profile: null, error: error.message };
      if (!data.user) return { user: null, profile: null, error: 'Registration failed' };

      // Create profile row in Supabase
      const profile: Profile = {
        id: data.user.id,
        fullName,
        phone: emailOrPhone.includes('@') ? undefined : emailOrPhone,
        preferredLanguage: language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert({
        id: profile.id,
        full_name: profile.fullName,
        phone: profile.phone,
        preferred_language: profile.preferredLanguage,
      });

      return { user: data.user, profile };
    } catch (err: any) {
      return { user: null, profile: null, error: err.message || 'Sign up failed' };
    }
  },

  /**
   * Request OTP
   */
  async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Verify OTP
   */
  async verifyOtp(phone: string, token: string): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      const demoProfile: Profile = {
        id: 'usr-demo-001',
        fullName: 'Kirana Store Merchant',
        phone,
        preferredLanguage: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { user: { id: demoProfile.id }, profile: demoProfile };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
        token,
        type: 'sms',
      });
      if (error) return { user: null, profile: null, error: error.message };
      const profile = await this.getProfile(data.user!.id);
      return { user: data.user, profile };
    } catch (e: any) {
      return { user: null, profile: null, error: e.message };
    }
  },

  /**
   * Reset password email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Fetch profile from Supabase or cached storage
   */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured()) {
      const cached = await AsyncStorage.getItem('qb_demo_user');
      return cached ? JSON.parse(cached) : null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        preferredLanguage: data.preferred_language,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (e) {
      return null;
    }
  },

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem('qb_demo_user');
    await AsyncStorage.removeItem('qb_active_business');
  },
};

