import { supabase, isSupabaseConfigured } from './supabase';
import { BusinessMember } from '../types';
import { useBusinessStore } from '../store/business.store';
import { can } from '../utils/permissions';

const CONFIG_ERROR = 'Supabase is not configured. Please check your environment variables.';

const extractFunctionError = async (err: any, fallback: string): Promise<string> => {
  if (!err) return fallback;

  const status = typeof err?.context?.status === 'number' ? err.context.status : undefined;

  try {
    if (err.context && typeof err.context.text === 'function') {
      const responseToRead =
        typeof err.context.clone === 'function' ? err.context.clone() : err.context;
      const rawText = await responseToRead.text();
      if (rawText) {
        try {
          const body = JSON.parse(rawText);
          const parsedMsg = body?.error || body?.message || body?.msg;
          if (typeof parsedMsg === 'string' && parsedMsg.trim().length > 0) {
            if (status === 401 && parsedMsg.toLowerCase().includes('invalid jwt')) {
              return 'Edge Function rejected JWT (401). Redeploy create-staff with verify_jwt = false (--no-verify-jwt).';
            }
            return parsedMsg;
          }
        } catch {
          if (status === 404 || rawText.toLowerCase().includes('not found')) {
            return 'Staff Edge Function (create-staff) is not deployed on Supabase yet. Deploy it with: npx supabase functions deploy create-staff --no-verify-jwt';
          }
          return rawText.slice(0, 200);
        }
      }
    } else if (err.context && typeof err.context.json === 'function') {
      const body = await err.context.json();
      const parsedMsg = body?.error || body?.message || body?.msg;
      if (typeof parsedMsg === 'string' && parsedMsg.trim().length > 0) {
        return parsedMsg;
      }
    }
  } catch {
    // Ignore body extraction errors and fall back to status/message checks below
  }

  if (status === 404) {
    return 'Staff Edge Function (create-staff) is not deployed on Supabase yet. Deploy it with: npx supabase functions deploy create-staff --no-verify-jwt';
  }
  if (status === 401) {
    return 'Authentication rejected by Edge Function (401). Redeploy create-staff with --no-verify-jwt or sign in again.';
  }

  const message = typeof err.message === 'string' ? err.message : '';
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return 'Network error. Please check your internet connection and retry.';
  }
  return status ? `${fallback} (HTTP ${status})` : message || fallback;
};

const invokeStaffFunction = async (payload: Record<string, unknown>) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      data: null,
      error: { message: 'Your session has expired. Please log in again.' },
    };
  }

  return supabase.functions.invoke('create-staff', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
};

export interface CreateStaffInput {
  fullName: string;
  phone: string;
  password: string;
}

export const staffService = {
  /**
   * Lists all team members joined with their public.profiles row for a business.
   */
  async listStaff(
    businessId: string
  ): Promise<{ staff: BusinessMember[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { staff: [], error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_staff')) {
      return { staff: [], error: 'Not permitted' };
    }

    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('id, business_id, user_id, role, status, created_at, profiles(id, full_name, phone, avatar_url, preferred_language, created_at, updated_at)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { staff: [], error: error?.message || 'Failed to load staff members.' };
      }

      const staff: BusinessMember[] = data.map((row: any) => {
        const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          businessId: row.business_id,
          userId: row.user_id,
          role: row.role,
          status: row.status,
          createdAt: row.created_at,
          profile: prof
            ? {
                id: prof.id,
                fullName: prof.full_name,
                phone: prof.phone || undefined,
                avatarUrl: prof.avatar_url || undefined,
                preferredLanguage: prof.preferred_language || 'en',
                createdAt: prof.created_at,
                updatedAt: prof.updated_at,
              }
            : undefined,
        };
      });

      return { staff };
    } catch (e: any) {
      return { staff: [], error: e?.message || 'Network error while loading staff.' };
    }
  },

  /**
   * Creates a new staff login via the create-staff Edge Function (never switches owner session).
   */
  async createStaff(
    businessId: string,
    input: CreateStaffInput
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_staff')) {
      return { success: false, error: 'Not permitted' };
    }

    const digits = input.phone.replace(/\D/g, '');
    if (!input.fullName.trim()) {
      return { success: false, error: 'Please enter the staff member name.' };
    }
    if (digits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (!input.password || input.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const { data, error } = await invokeStaffFunction({
        action: 'create',
        businessId,
        fullName: input.fullName.trim(),
        phone: digits,
        password: input.password,
      });

      if (error) {
        const msg = await extractFunctionError(error, 'Failed to create staff account. Please retry.');
        return { success: false, error: msg };
      }

      if (data?.error) {
        return { success: false, error: String(data.error) };
      }

      return { success: true, userId: data?.userId };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Network error while creating staff. Please retry.',
      };
    }
  },

  /**
   * Activates or suspends a staff member in business_members.
   */
  async setStaffStatus(
    businessId: string,
    memberId: string,
    status: 'active' | 'suspended'
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_staff')) {
      return { success: false, error: 'Not permitted' };
    }

    try {
      const { error } = await supabase
        .from('business_members')
        .update({ status })
        .eq('id', memberId)
        .eq('business_id', businessId)
        .neq('role', 'owner');

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to update staff status.' };
    }
  },

  /**
   * Resets a staff member's password via the create-staff Edge Function.
   */
  async resetStaffPassword(
    businessId: string,
    userId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_staff')) {
      return { success: false, error: 'Not permitted' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const { data, error } = await invokeStaffFunction({
        action: 'reset-staff-password',
        businessId,
        userId,
        password,
      });

      if (error) {
        const msg = await extractFunctionError(error, 'Failed to reset password.');
        return { success: false, error: msg };
      }

      if (data?.error) {
        return { success: false, error: String(data.error) };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset password.' };
    }
  },

  /**
   * Removes a staff member from the business via the create-staff Edge Function.
   */
  async removeStaff(
    businessId: string,
    memberId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_staff')) {
      return { success: false, error: 'Not permitted' };
    }

    try {
      const { data, error } = await invokeStaffFunction({
        action: 'remove-staff',
        businessId,
        memberId,
        mode: 'delete',
      });

      if (error) {
        const msg = await extractFunctionError(error, 'Failed to remove staff member.');
        return { success: false, error: msg };
      }

      if (data?.error) {
        return { success: false, error: String(data.error) };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to remove staff member.' };
    }
  },
};
