import { supabase, isSupabaseConfigured } from './supabase';
import { Business, Subscription, BusinessMember } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const businessService = {
  /**
   * Registers a new business and creates owner membership + default free subscription
   */
  async createBusiness(
    ownerId: string,
    data: Omit<Business, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ business: Business | null; error?: string }> {
    const businessId = `biz-${Date.now()}`;
    const newBiz: Business = {
      id: businessId,
      ownerId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      await AsyncStorage.setItem('qb_active_business', JSON.stringify(newBiz));
      return { business: newBiz };
    }

    try {
      const { data: inserted, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: ownerId,
          name: data.name,
          business_type: data.businessType,
          owner_name: data.ownerName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          logo_url: data.logoUrl,
          is_gst_registered: data.isGstRegistered,
          gstin: data.gstin,
          currency: data.currency || 'INR',
          tax_inclusive: data.taxInclusive,
          default_tax_rate: data.defaultTaxRate,
          invoice_prefix: data.invoicePrefix || 'QB',
        })
        .select()
        .single();

      if (error) return { business: null, error: error.message };

      // Add owner to business_members
      await supabase.from('business_members').insert({
        business_id: inserted.id,
        user_id: ownerId,
        role: 'owner',
        status: 'active',
      });

      // Initialize Free Subscription
      await supabase.from('subscriptions').insert({
        business_id: inserted.id,
        plan: 'free',
        status: 'active',
        max_staff: 1,
      });

      const biz: Business = {
        id: inserted.id,
        ownerId: inserted.owner_id,
        name: inserted.name,
        businessType: inserted.business_type,
        ownerName: inserted.owner_name,
        phone: inserted.phone,
        email: inserted.email,
        address: inserted.address,
        logoUrl: inserted.logo_url,
        isGstRegistered: inserted.is_gst_registered,
        gstin: inserted.gstin,
        currency: inserted.currency,
        taxInclusive: inserted.tax_inclusive,
        defaultTaxRate: Number(inserted.default_tax_rate),
        invoicePrefix: inserted.invoice_prefix,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };

      await AsyncStorage.setItem('qb_active_business', JSON.stringify(biz));
      return { business: biz };
    } catch (err: any) {
      return { business: null, error: err.message };
    }
  },

  /**
   * Fetches business for the logged-in owner/member
   */
  async getBusiness(userId: string): Promise<Business | null> {
    if (!isSupabaseConfigured()) {
      const cached = await AsyncStorage.getItem('qb_active_business');
      return cached ? JSON.parse(cached) : null;
    }

    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('business_id, role, businesses(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (error || !data || !data.businesses) return null;

      const raw = data.businesses as any;
      const biz: Business = {
        id: raw.id,
        ownerId: raw.owner_id,
        name: raw.name,
        businessType: raw.business_type,
        ownerName: raw.owner_name,
        phone: raw.phone,
        email: raw.email,
        address: raw.address,
        logoUrl: raw.logo_url,
        isGstRegistered: raw.is_gst_registered,
        gstin: raw.gstin,
        currency: raw.currency,
        taxInclusive: raw.tax_inclusive,
        defaultTaxRate: Number(raw.default_tax_rate),
        invoicePrefix: raw.invoice_prefix,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      };

      await AsyncStorage.setItem('qb_active_business', JSON.stringify(biz));
      return biz;
    } catch (e) {
      return null;
    }
  },

  /**
   * Update Business Profile
   */
  async updateBusiness(id: string, updates: Partial<Business>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      const cached = await AsyncStorage.getItem('qb_active_business');
      if (cached) {
        const merged = { ...JSON.parse(cached), ...updates, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem('qb_active_business', JSON.stringify(merged));
      }
      return { success: true };
    }

    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.ownerName) dbUpdates.owner_name = updates.ownerName;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.address) dbUpdates.address = updates.address;
      if (updates.logoUrl) dbUpdates.logo_url = updates.logoUrl;
      if (updates.isGstRegistered !== undefined) dbUpdates.is_gst_registered = updates.isGstRegistered;
      if (updates.gstin) dbUpdates.gstin = updates.gstin;
      if (updates.defaultTaxRate !== undefined) dbUpdates.default_tax_rate = updates.defaultTaxRate;
      if (updates.invoicePrefix) dbUpdates.invoice_prefix = updates.invoicePrefix;
      if (updates.taxInclusive !== undefined) dbUpdates.tax_inclusive = updates.taxInclusive;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase.from('businesses').update(dbUpdates).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Fetch active subscription details
   */
  async getSubscription(businessId: string): Promise<Subscription> {
    const defaultFree: Subscription = {
      id: `sub-${businessId}`,
      businessId,
      plan: 'free',
      status: 'active',
      startsAt: new Date().toISOString(),
      autoRenew: true,
      maxStaff: 1,
      cloudBackupEnabled: false,
      advancedReportsEnabled: false,
    };

    if (!isSupabaseConfigured()) {
      const cached = await AsyncStorage.getItem(`qb_sub_${businessId}`);
      return cached ? JSON.parse(cached) : defaultFree;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error || !data) return defaultFree;

      return {
        id: data.id,
        businessId: data.business_id,
        plan: data.plan,
        billingCycle: data.billing_cycle,
        status: data.status,
        startsAt: data.starts_at,
        expiresAt: data.expires_at,
        autoRenew: data.auto_renew,
        maxStaff: data.max_staff,
        cloudBackupEnabled: data.cloud_backup_enabled,
        advancedReportsEnabled: data.advanced_reports_enabled,
      };
    } catch (e) {
      return defaultFree;
    }
  },

  /**
   * Upgrade subscription with validated server-side state
   */
  async upgradeSubscription(
    businessId: string,
    plan: 'starter' | 'pro',
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; error?: string }> {
    const expiresAt = new Date();
    if (billingCycle === 'monthly') {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 365);
    }

    const isPro = plan === 'pro';
    const subData: Partial<Subscription> = {
      plan,
      billingCycle,
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      maxStaff: isPro ? 5 : 2,
      cloudBackupEnabled: true,
      advancedReportsEnabled: isPro,
    };

    if (!isSupabaseConfigured()) {
      await AsyncStorage.setItem(`qb_sub_${businessId}`, JSON.stringify({ businessId, ...subData }));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          business_id: businessId,
          plan,
          billing_cycle: billingCycle,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          max_staff: isPro ? 5 : 2,
          cloud_backup_enabled: true,
          advanced_reports_enabled: isPro,
          updated_at: new Date().toISOString(),
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};

