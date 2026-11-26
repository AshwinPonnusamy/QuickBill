import { supabase, isSupabaseConfigured } from './supabase';
import { Business, Subscription, UserRole } from '../types';
import { useBusinessStore } from '../store/business.store';
import { can } from '../utils/permissions';

const CONFIG_ERROR = 'Supabase is not configured. Please check your environment variables.';

const mapBusinessRow = (raw: any): Business => ({
  id: raw.id,
  ownerId: raw.owner_id,
  name: raw.name,
  businessType: raw.business_type,
  ownerName: raw.owner_name,
  phone: raw.phone,
  email: raw.email || undefined,
  address: raw.address,
  logoUrl: raw.logo_url || undefined,
  isGstRegistered: Boolean(raw.is_gst_registered),
  gstin: raw.gstin || undefined,
  currency: raw.currency || 'INR',
  taxInclusive: Boolean(raw.tax_inclusive),
  defaultTaxRate: Number(raw.default_tax_rate || 0),
  invoicePrefix: raw.invoice_prefix || 'QB',
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

const defaultFreeSubscription = (businessId: string): Subscription => ({
  id: `sub-${businessId}`,
  businessId,
  plan: 'free',
  status: 'active',
  startsAt: new Date().toISOString(),
  autoRenew: true,
  maxStaff: 1,
  cloudBackupEnabled: false,
  advancedReportsEnabled: false,
});

export const businessService = {
  /**
   * Registers a new business in Supabase and creates owner membership + default free subscription
   */
  async createBusiness(
    ownerId: string,
    data: Omit<Business, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ business: Business | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { business: null, error: CONFIG_ERROR };
    }

    try {
      // Ensure owner profile exists in public.profiles before creating business (satisfies businesses_owner_id_fkey)
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: ownerId,
          full_name: data.ownerName,
          phone: data.phone,
          preferred_language: 'en',
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        return { business: null, error: profileError.message };
      }

      const { data: inserted, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: ownerId,
          name: data.name,
          business_type: data.businessType,
          owner_name: data.ownerName,
          phone: data.phone,
          email: data.email || null,
          address: data.address,
          logo_url: data.logoUrl || null,
          is_gst_registered: data.isGstRegistered,
          gstin: data.gstin || null,
          currency: data.currency || 'INR',
          tax_inclusive: data.taxInclusive,
          default_tax_rate: data.defaultTaxRate,
          invoice_prefix: data.invoicePrefix || 'QB',
        })
        .select()
        .single();

      if (error || !inserted) {
        return { business: null, error: error?.message || 'Failed to register business' };
      }

      const { error: memberError } = await supabase.from('business_members').insert({
        business_id: inserted.id,
        user_id: ownerId,
        role: 'owner',
        status: 'active',
      });

      if (memberError) {
        return { business: null, error: memberError.message };
      }

      // Initialize default free subscription record if permitted
      const { error: subError } = await supabase.from('subscriptions').insert({
        business_id: inserted.id,
        plan: 'free',
        status: 'active',
        max_staff: 1,
      });

      if (subError) {
        console.warn('Could not initialize subscription row:', subError.message);
      }

      return { business: mapBusinessRow(inserted) };
    } catch (err: any) {
      return { business: null, error: err.message || 'Setup failed' };
    }
  },

  /**
   * Fetches active business for the logged-in user from Supabase.
   * Checks owned businesses directly first (avoids RLS recursion on business_members),
   * then falls back to business_members for staff accounts.
   */
  async getBusiness(userId: string): Promise<Business | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: ownedBiz, error: ownedError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ownedError && ownedBiz) {
        // Ensure owner membership exists for RLS on child tables (categories, products, invoices)
        void (async () => {
          try {
            const { data: existingMember } = await supabase
              .from('business_members')
              .select('id')
              .eq('business_id', ownedBiz.id)
              .eq('user_id', userId)
              .maybeSingle();

            if (!existingMember) {
              const { error: insertErr } = await supabase.from('business_members').insert({
                business_id: ownedBiz.id,
                user_id: userId,
                role: 'owner',
                status: 'active',
              });
              if (insertErr) {
                console.warn('Could not sync owner membership:', insertErr.message);
              }
            }
          } catch (err: any) {
            console.warn('Could not sync owner membership:', err?.message || err);
          }
        })();

        return mapBusinessRow(ownedBiz);
      }

      const { data, error } = await supabase
        .from('business_members')
        .select('business_id, role, businesses(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error || !data || !data.businesses) return null;

      return mapBusinessRow(data.businesses);
    } catch {
      return null;
    }
  },

  /**
   * Resolves the authenticated user's role in the given business.
   * Returns 'owner' when the user is businesses.owner_id, otherwise reads active
   * business_members row and fails closed ('staff') on error or missing row.
   */
  async getMyRole(businessId: string, userId: string): Promise<UserRole> {
    if (!isSupabaseConfigured() || !businessId || !userId) return 'staff';

    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .maybeSingle();

      if (biz?.owner_id === userId) {
        return 'owner';
      }

      const { data: member, error } = await supabase
        .from('business_members')
        .select('role, status')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !member?.role) return 'staff';
      if (member.role === 'owner' || member.role === 'admin' || member.role === 'staff') {
        return member.role;
      }
      return 'staff';
    } catch {
      return 'staff';
    }
  },

  /**
   * Checks membership status for non-owner users so suspended or removed staff are blocked.
   */
  async getMembershipStatus(
    businessId: string,
    userId: string
  ): Promise<'active' | 'invited' | 'suspended' | 'missing'> {
    if (!isSupabaseConfigured() || !businessId || !userId) return 'missing';

    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .maybeSingle();

      if (biz?.owner_id === userId) {
        return 'active';
      }

      const { data: member, error } = await supabase
        .from('business_members')
        .select('status')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !member?.status) return 'missing';
      if (
        member.status === 'active' ||
        member.status === 'invited' ||
        member.status === 'suspended'
      ) {
        return member.status;
      }
      return 'missing';
    } catch {
      return 'missing';
    }
  },

  /**
   * Detects whether a user has a suspended membership across any business.
   */
  async isUserSuspended(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { data } = await supabase
        .from('business_members')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'suspended')
        .limit(1);

      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  },

  /**
   * Update Business Profile in Supabase
   */
  async updateBusiness(
    id: string,
    updates: Partial<Business>
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_settings')) {
      return { success: false, error: 'Not permitted' };
    }

    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.businessType !== undefined) dbUpdates.business_type = updates.businessType;
      if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email || null;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl || null;
      if (updates.isGstRegistered !== undefined) dbUpdates.is_gst_registered = updates.isGstRegistered;
      if (updates.gstin !== undefined) dbUpdates.gstin = updates.gstin || null;
      if (updates.defaultTaxRate !== undefined) dbUpdates.default_tax_rate = updates.defaultTaxRate;
      if (updates.invoicePrefix !== undefined) dbUpdates.invoice_prefix = updates.invoicePrefix;
      if (updates.taxInclusive !== undefined) dbUpdates.tax_inclusive = updates.taxInclusive;

      const { data: updatedRow, error } = await supabase
        .from('businesses')
        .update(dbUpdates)
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error || !updatedRow) {
        return {
          success: false,
          error: error?.message || 'Unable to update shop profile. Check owner permissions.',
        };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Update failed' };
    }
  },

  /**
   * Fetch active subscription details from Supabase
   */
  async getSubscription(businessId: string): Promise<Subscription> {
    if (!isSupabaseConfigured()) {
      return defaultFreeSubscription(businessId);
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error || !data) return defaultFreeSubscription(businessId);

      return {
        id: data.id,
        businessId: data.business_id,
        plan: data.plan,
        billingCycle: data.billing_cycle || undefined,
        status: data.status,
        startsAt: data.starts_at,
        expiresAt: data.expires_at || undefined,
        autoRenew: Boolean(data.auto_renew),
        maxStaff: Number(data.max_staff || 1),
        cloudBackupEnabled: Boolean(data.cloud_backup_enabled),
        advancedReportsEnabled: Boolean(data.advanced_reports_enabled),
      };
    } catch {
      return defaultFreeSubscription(businessId);
    }
  },

  /**
   * Upgrade subscription in Supabase
   */
  async upgradeSubscription(
    businessId: string,
    plan: 'starter' | 'pro',
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'manage_subscription')) {
      return { success: false, error: 'Not permitted' };
    }

    const expiresAt = new Date();
    if (billingCycle === 'monthly') {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 365);
    }

    const isPro = plan === 'pro';

    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            business_id: businessId,
            plan,
            billing_cycle: billingCycle,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            max_staff: isPro ? 5 : 2,
            cloud_backup_enabled: true,
            advanced_reports_enabled: isPro,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'business_id' }
        );

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Upgrade failed' };
    }
  },
};
