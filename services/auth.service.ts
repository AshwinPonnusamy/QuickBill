import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, SupportedLanguage } from '../types';

const CONFIG_ERROR = 'Supabase is not configured. Please check your environment variables.';

const SYNTHETIC_PHONE_DOMAIN = 'quickbill.app';

const formatIdentifierAsEmail = (emailOrPhone: string): string => {
  const trimmed = emailOrPhone.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const digits = trimmed.replace(/\D/g, '');
  return `${digits}@${SYNTHETIC_PHONE_DOMAIN}`;
};

const mapProfileRow = (data: any): Profile => ({
  id: data.id,
  fullName: data.full_name,
  phone: data.phone || undefined,
  avatarUrl: data.avatar_url || undefined,
  preferredLanguage: data.preferred_language || 'en',
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export const authService = {
  /**
   * Ensure a corresponding row exists in public.profiles for the authenticated user
   */
  async ensureProfile(
    user: any,
    fallbackFullName?: string,
    language: SupportedLanguage = 'en'
  ): Promise<Profile | null> {
    if (!user?.id) return null;

    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    const fullName =
      fallbackFullName ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Merchant';

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          phone: user.phone || user.user_metadata?.phone || null,
          preferred_language: user.user_metadata?.preferred_language || language,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error || !data) {
      if (error) {
        console.warn('Profile upsert failed:', error.message);
      }
      return {
        id: user.id,
        fullName,
        phone: user.phone || undefined,
        preferredLanguage: language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return mapProfileRow(data);
  },

  /**
   * Login with email or phone + password via Supabase Auth
   */
  async signIn(
    emailOrPhone: string,
    password: string
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    const trimmed = emailOrPhone.trim();
    if (!trimmed.includes('@') && trimmed.replace(/\D/g, '').length < 10) {
      return {
        user: null,
        profile: null,
        error: 'Please enter a valid email address or 10-digit mobile number.',
      };
    }

    const formattedEmail = formatIdentifierAsEmail(trimmed);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error || !data.user) {
        return { user: null, profile: null, error: error?.message || 'Login failed' };
      }

      const profile = await this.ensureProfile(data.user);
      return { user: data.user, profile };
    } catch (err: any) {
      return { user: null, profile: null, error: err.message || 'Login failed' };
    }
  },

  /**
   * Sign up new user and initialize profile in Supabase
   */
  async signUp(
    emailOrPhone: string,
    password: string,
    fullName: string,
    language: SupportedLanguage = 'en'
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    const trimmed = emailOrPhone.trim();
    if (!trimmed.includes('@') && trimmed.replace(/\D/g, '').length < 10) {
      return {
        user: null,
        profile: null,
        error: 'Please enter a valid email address or 10-digit mobile number.',
      };
    }

    const formattedEmail = formatIdentifierAsEmail(trimmed);
    const phone = emailOrPhone.includes('@') ? null : emailOrPhone.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            preferred_language: language,
          },
        },
      });

      if (error) return { user: null, profile: null, error: error.message };
      if (!data.user) return { user: null, profile: null, error: 'Registration failed' };

      if (!data.session) {
        return {
          user: null,
          profile: null,
          error: 'Please check your email to confirm your account before logging in.',
        };
      }

      const profile = await this.ensureProfile(data.user, fullName, language);
      return { user: data.user, profile };
    } catch (err: any) {
      return { user: null, profile: null, error: err.message || 'Sign up failed' };
    }
  },

  /**
   * Request Phone OTP via Supabase Auth
   */
  async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to send OTP' };
    }
  },

  /**
   * Verify Phone OTP via Supabase Auth
   */
  async verifyOtp(
    phone: string,
    token: string
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
        token,
        type: 'sms',
      });
      if (error || !data.user) {
        return { user: null, profile: null, error: error?.message || 'OTP verification failed' };
      }
      const profile = await this.ensureProfile(data.user);
      return { user: data.user, profile };
    } catch (e: any) {
      return { user: null, profile: null, error: e.message || 'OTP verification failed' };
    }
  },

  /**
   * Request password reset email via Supabase Auth
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to send reset link' };
    }
  },

  /**
   * Fetch profile from Supabase
   */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return mapProfileRow(data);
    } catch {
      return null;
    }
  },

  /**
   * Sign out from Supabase Auth
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },
};
