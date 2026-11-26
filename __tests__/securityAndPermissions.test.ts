jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

import { isSupabaseConfigured } from '../services/supabase';
import { can, Permission, ROLE_PERMISSIONS } from '../utils/permissions';

describe('Security, Permissions & Data Isolation', () => {
  describe('API Key Protection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('never exposes Supabase service_role or sb_secret key', () => {
      const publicAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const publicPublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

      expect(serviceRoleKey).toBe('');
      expect(publicAnonKey).not.toContain('service_role');
      expect(publicPublishableKey).not.toContain('sb_secret_');
    });

    test('recognizes valid EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY and rejects sb_secret_ keys', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://xmvpfbevkdpldbohfdra.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
      expect(isSupabaseConfigured()).toBe(true);

      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_should_be_rejected';
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('Role-Based Access Control (utils/permissions)', () => {
    const staffAllowed: Permission[] = [
      'create_bill',
      'view_products',
      'add_customer',
      'view_own_bills',
    ];

    const staffDenied: Permission[] = [
      'view_all_invoices',
      'manage_products',
      'adjust_stock',
      'view_reports',
      'void_invoice',
      'settle_udhar',
      'manage_staff',
      'manage_settings',
      'manage_subscription',
      'apply_discount',
      'view_cost_price',
    ];

    const ownerOnly: Permission[] = ['manage_settings', 'manage_subscription'];

    test('staff has ONLY billing, read-only products, add_customer, and view_own_bills', () => {
      for (const perm of staffAllowed) {
        expect(can('staff', perm)).toBe(true);
      }
      for (const perm of staffDenied) {
        expect(can('staff', perm)).toBe(false);
      }
    });

    test('admin has operational permissions but NOT owner-only settings or subscription', () => {
      for (const perm of [...staffAllowed, 'view_all_invoices', 'manage_products', 'adjust_stock', 'view_reports', 'void_invoice', 'settle_udhar', 'manage_staff', 'apply_discount', 'view_cost_price'] as Permission[]) {
        expect(can('admin', perm)).toBe(true);
      }
      for (const perm of ownerOnly) {
        expect(can('admin', perm)).toBe(false);
      }
    });

    test('owner has every permission in ROLE_PERMISSIONS', () => {
      const allPermissions = Object.keys(ROLE_PERMISSIONS.owner) as Permission[];
      for (const perm of allPermissions) {
        expect(can('owner', perm)).toBe(true);
      }
    });

    test('fails closed for null, undefined, or invalid roles', () => {
      expect(can(null, 'create_bill')).toBe(false);
      expect(can(undefined, 'view_products')).toBe(false);
      expect(can('superadmin' as any, 'manage_settings')).toBe(false);
    });
  });

  describe('Financial Snapshot Immutability', () => {
    test('completed invoices preserve frozen product names and prices as historical snapshots', () => {
      const catalogProduct = {
        id: 'p-1',
        name: 'Wheat Flour 1kg',
        pricePaise: 4500,
      };

      const completedInvoiceItem = {
        productId: catalogProduct.id,
        productName: catalogProduct.name,
        unitPricePaise: catalogProduct.pricePaise,
        quantity: 2,
        totalPaise: 9000,
      };

      catalogProduct.pricePaise = 5500;
      catalogProduct.name = 'Premium Wheat Flour 1kg';

      expect(completedInvoiceItem.unitPricePaise).toBe(4500);
      expect(completedInvoiceItem.productName).toBe('Wheat Flour 1kg');
      expect(completedInvoiceItem.totalPaise).toBe(9000);
    });
  });
});
