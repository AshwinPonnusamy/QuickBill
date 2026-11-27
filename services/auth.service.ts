import { supabase, isSupabaseConfigured } from "./supabase";
import { Profile, SupportedLanguage } from "../types";

const CONFIG_ERROR =
  "Supabase is not configured. Please check your environment variables.";

const SYNTHETIC_PHONE_DOMAIN = "quickbill.app";

export const normalizePhone10 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  return digits;
};

export const formatE164Phone = (phone: string): string => {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  return `+91${normalizePhone10(trimmed)}`;
};

const mapOtpError = (
  message?: string,
  fallback = "OTP request failed",
): string => {
  const msg = (message || "").toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("429")
  ) {
    return "Too many OTP attempts. Please wait a minute before trying again.";
  }
  if (msg.includes("expired") || msg.includes("otp_expired")) {
    return "This OTP has expired. Please request a new verification code.";
  }
  if (msg.includes("invalid") || msg.includes("token")) {
    return "Invalid verification code. Please check the 6-digit OTP and try again.";
  }
  return message || fallback;
};

const formatIdentifierAsEmail = (emailOrPhone: string): string => {
  const trimmed = emailOrPhone.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const digits = normalizePhone10(trimmed);
  return `${digits}@${SYNTHETIC_PHONE_DOMAIN}`;
};

const mapProfileRow = (data: any): Profile => ({
  id: data.id,
  fullName: data.full_name,
  phone: data.phone || undefined,
  avatarUrl: data.avatar_url || undefined,
  preferredLanguage: data.preferred_language || "en",
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
    language: SupportedLanguage = "en",
  ): Promise<Profile | null> {
    if (!user?.id) return null;

    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    const fullName =
      fallbackFullName ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Merchant";

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          phone: user.phone || user.user_metadata?.phone || null,
          preferred_language:
            user.user_metadata?.preferred_language || language,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error || !data) {
      if (error) {
        console.warn("Profile upsert failed:", error.message);
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
    password: string,
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    const trimmed = emailOrPhone.trim();
    if (!trimmed.includes("@") && trimmed.replace(/\D/g, "").length < 10) {
      return {
        user: null,
        profile: null,
        error: "Please enter a valid email address or 10-digit mobile number.",
      };
    }

    const formattedEmail = formatIdentifierAsEmail(trimmed);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error || !data.user) {
        return {
          user: null,
          profile: null,
          error: error?.message || "Login failed",
        };
      }

      const profile = await this.ensureProfile(data.user);
      return { user: data.user, profile };
    } catch (err: any) {
      return {
        user: null,
        profile: null,
        error: err.message || "Login failed",
      };
    }
  },

  /**
   * Sign up new user and initialize profile in Supabase
   */
  async signUp(
    emailOrPhone: string,
    password: string,
    fullName: string,
    language: SupportedLanguage = "en",
  ): Promise<{ user: any; profile: Profile | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    const trimmed = emailOrPhone.trim();
    if (!trimmed.includes("@") && trimmed.replace(/\D/g, "").length < 10) {
      return {
        user: null,
        profile: null,
        error: "Please enter a valid email address or 10-digit mobile number.",
      };
    }

    const formattedEmail = formatIdentifierAsEmail(trimmed);
    const phone = emailOrPhone.includes("@") ? null : emailOrPhone.trim();

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
      if (!data.user)
        return { user: null, profile: null, error: "Registration failed" };

      if (!data.session) {
        return {
          user: null,
          profile: null,
          error:
            "Please check your email to confirm your account before logging in.",
        };
      }

      const profile = await this.ensureProfile(data.user, fullName, language);
      return { user: data.user, profile };
    } catch (err: any) {
      return {
        user: null,
        profile: null,
        error: err.message || "Sign up failed",
      };
    }
  },

  /**
   * Request Phone OTP via Supabase Auth
   */
  async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const digits = normalizePhone10(phone);
    if (digits.length < 10) {
      return {
        success: false,
        error: "Please enter a valid 10-digit mobile number.",
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatE164Phone(phone),
      });
      if (error)
        return {
          success: false,
          error: mapOtpError(error.message, "Failed to send OTP"),
        };
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: mapOtpError(e.message, "Failed to send OTP"),
      };
    }
  },

  /**
   * Verify Phone OTP via Supabase Auth.
   * Guards against duplicate accounts when the same phone was previously registered
   * with password login ({phone}@quickbill.app) without auto-merging unverified identities.
   */
  async verifyOtp(
    phone: string,
    token: string,
  ): Promise<{
    user: any;
    profile: Profile | null;
    accountConflict?: boolean;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, error: CONFIG_ERROR };
    }

    const e164 = formatE164Phone(phone);
    const digits10 = normalizePhone10(phone);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: token.trim(),
        type: "sms",
      });
      if (error || !data.user) {
        return {
          user: null,
          profile: null,
          error: mapOtpError(error?.message, "OTP verification failed"),
        };
      }

      // Check if another user profile already owns this verified phone number
      if (digits10.length >= 10) {
        let hasConflict = false;
        let rpcResolved = false;

        try {
          if (typeof supabase.rpc === "function") {
            const rpcCheck = await supabase.rpc(
              "check_phone_account_conflict",
              {
                p_digits10: digits10,
                p_e164: e164,
              },
            );
            if (
              rpcCheck &&
              !rpcCheck.error &&
              typeof rpcCheck.data === "boolean"
            ) {
              hasConflict = rpcCheck.data;
              rpcResolved = true;
            }
          }
        } catch {
          // Fallback to profiles query below if RPC is unavailable
        }

        if (!rpcResolved) {
          const { data: existingProfiles } = await supabase
            .from("profiles")
            .select("id, phone")
            .neq("id", data.user.id)
            .or(`phone.eq.${digits10},phone.eq.${e164}`)
            .limit(1);
          hasConflict =
            Array.isArray(existingProfiles) && existingProfiles.length > 0;
        }

        if (hasConflict) {
          // Do not auto-merge or leave a duplicate unlinked OTP session active
          await supabase.auth.signOut();
          return {
            user: null,
            profile: null,
            accountConflict: true,
            error:
              "An account with this mobile number already exists with password login. Please sign in with your password to keep your existing shop data.",
          };
        }
      }

      const profile = await this.ensureProfile(data.user);
      return { user: data.user, profile };
    } catch (e: any) {
      return {
        user: null,
        profile: null,
        error: mapOtpError(e.message, "OTP verification failed"),
      };
    }
  },

  /**
   * Safely link a phone number to the currently authenticated user via OTP verification
   */
  async linkPhoneToCurrentUser(
    phone: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }
    try {
      const { error } = await supabase.auth.updateUser({
        phone: formatE164Phone(phone),
      });
      if (error)
        return {
          success: false,
          error: mapOtpError(error.message, "Failed to initiate phone linking"),
        };
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: mapOtpError(e.message, "Failed to initiate phone linking"),
      };
    }
  },

  /**
   * Verify phone_change OTP to complete linking a phone number to the current account
   */
  async verifyPhoneLinkOtp(
    phone: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formatE164Phone(phone),
        token: token.trim(),
        type: "phone_change",
      });
      if (error)
        return {
          success: false,
          error: mapOtpError(error.message, "Phone verification failed"),
        };
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: mapOtpError(e.message, "Phone verification failed"),
      };
    }
  },

  /**
   * Request password reset email via Supabase Auth
   */
  async resetPassword(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || "Failed to send reset link",
      };
    }
  },

  /**
   * Fetch profile from Supabase
   */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
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
