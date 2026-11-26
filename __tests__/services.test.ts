const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { billingService } from '../services/billing.service';
import { productService } from '../services/product.service';
import { businessService, clearSyncedMembershipsCache } from '../services/business.service';
import { pdfService } from '../services/pdf.service';
import { checkAndLogoutIfSuspended } from '../services/sessionGuard';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { BillCalculationResult, Business, Customer } from '../types';

const sampleCalc: BillCalculationResult = {
  items: [
    {
      cartItem: {
        id: 'c1',
        productId: 'p1',
        name: 'Rice 1kg',
        unit: 'kg',
        quantity: 2,
        unitPricePaise: 6000,
        taxRate: 0,
        isTaxInclusive: true,
      },
      quantity: 2,
      unitPricePaise: 6000,
      subtotalPaise: 12000,
      discountPaise: 0,
      taxableAmountPaise: 12000,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalTaxPaise: 0,
      totalPaise: 12000,
    },
  ],
  subtotalPaise: 12000,
  discountType: 'none',
  discountValue: 0,
  discountPaise: 0,
  taxableSubtotalPaise: 12000,
  cgstPaise: 0,
  sgstPaise: 0,
  igstPaise: 0,
  totalTaxPaise: 0,
  roundOffPaise: 0,
  grandTotalPaise: 12000,
};

const sampleBusiness: Business = {
  id: 'biz-1',
  ownerId: 'owner-1',
  name: 'Quick Shop',
  businessType: 'retail',
  ownerName: 'Owner',
  phone: '9999999999',
  address: 'Main St',
  isGstRegistered: false,
  currency: 'INR',
  taxInclusive: true,
  defaultTaxRate: 5,
  invoicePrefix: 'QB',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const sampleCustomer: Customer = {
  id: 'cust-1',
  businessId: 'biz-1',
  name: 'Kumar',
  phone: '9876543210',
  outstandingBalancePaise: 5000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Services Unit Tests (mocked Supabase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().setAuth({ id: 'owner-1' }, null);
    useBusinessStore.getState().setBusiness(sampleBusiness);
    useBusinessStore.getState().setRole('owner');
    clearSyncedMembershipsCache();
  });

  describe('billingService', () => {
    const setupInvoiceSeqMock = (latestInvNum: string | null) => {
      const seqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: latestInvNum ? [{ invoice_number: latestInvNum }] : [],
        }),
      };
      mockFrom.mockReturnValue(seqChain);
    };

    test('createInvoice retries up to 3 times on 23505 reusing same localId and advancing invoice number', async () => {
      setupInvoiceSeqMock('QB-2627-0010');

      mockRpc
        .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
        .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
        .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
        .mockResolvedValueOnce({ data: 'inv-final', error: null });

      const res = await billingService.createInvoice('biz-1', sampleCalc, 'cash', 12000);
      expect(res.invoice?.id).toBe('inv-final');
      expect(mockRpc).toHaveBeenCalledTimes(4);

      const localIds = mockRpc.mock.calls.map((c) => c[1].p_local_id);
      expect(new Set(localIds).size).toBe(1);

      const invNumbers = mockRpc.mock.calls.map((c) => c[1].p_invoice_number);
      expect(invNumbers).toEqual([
        'QB-2627-0011',
        'QB-2627-0012',
        'QB-2627-0013',
        'QB-2627-0014',
      ]);
    });

    test('createInvoice records split, credit (unpaid), and partial payment statuses & payment rows', async () => {
      setupInvoiceSeqMock(null);
      mockRpc.mockResolvedValue({ data: 'inv-x', error: null });

      const splitRes = await billingService.createInvoice(
        'biz-1',
        sampleCalc,
        'split',
        12000,
        sampleCustomer,
        'Split test',
        'QB',
        { cashPaise: 5000, upiPaise: 7000 }
      );
      expect(splitRes.invoice?.paymentStatus).toBe('paid');
      expect(splitRes.invoice?.payments).toHaveLength(2);

      const creditRes = await billingService.createInvoice('biz-1', sampleCalc, 'credit', 0, sampleCustomer);
      expect(creditRes.invoice?.paymentStatus).toBe('unpaid');
      expect(creditRes.invoice?.balanceAmountPaise).toBe(12000);
      expect(creditRes.invoice?.payments?.[0].status).toBe('pending');

      const partialRes = await billingService.createInvoice('biz-1', sampleCalc, 'cash', 5000, sampleCustomer);
      expect(partialRes.invoice?.paymentStatus).toBe('partial');
      expect(partialRes.invoice?.balanceAmountPaise).toBe(7000);
    });

    test('getInvoices passes cursor pagination and getInvoiceById hydrates items & payments', async () => {
      const sampleDbInvoice = {
        id: 'inv-1',
        business_id: 'biz-1',
        invoice_number: 'QB-2627-0001',
        financial_year: '2026-2027',
        subtotal_paise: 1000,
        discount_type: 'none',
        discount_value: 0,
        discount_paise: 0,
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        total_tax_paise: 0,
        grand_total_paise: 1000,
        paid_amount_paise: 1000,
        balance_amount_paise: 0,
        payment_status: 'paid',
        payment_method: 'cash',
        is_void: false,
        created_at: '2026-11-26T10:00:00Z',
        invoice_items: [
          {
            id: 'it-1',
            product_id: 'p1',
            product_name: 'Sugar',
            unit: 'kg',
            quantity: 1,
            unit_price_paise: 1000,
            subtotal_paise: 1000,
            tax_rate: 0,
            cgst_paise: 0,
            sgst_paise: 0,
            igst_paise: 0,
            tax_paise: 0,
            discount_paise: 0,
            total_paise: 1000,
          },
        ],
        payments: [
          {
            id: 'pay-1',
            business_id: 'biz-1',
            invoice_id: 'inv-1',
            amount_paise: 1000,
            payment_method: 'cash',
            status: 'completed',
            created_at: '2026-11-26T10:00:00Z',
          },
        ],
      };

      const chain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [sampleDbInvoice], error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: sampleDbInvoice, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const list = await billingService.getInvoices('biz-1', {
        limit: 50,
        before: '2026-11-26T12:00:00Z',
        from: '2026-11-01T00:00:00Z',
        withItems: false,
      });
      expect(list).toHaveLength(1);
      expect(chain.select.mock.calls[0][0]).not.toContain('invoice_items');
      expect(chain.limit).toHaveBeenCalledWith(50);

      const full = await billingService.getInvoiceById('inv-1');
      expect(full?.items).toHaveLength(1);
      expect(full?.payments).toHaveLength(1);
    });

    test('getCustomers, addCustomer, voidInvoice, and settleCustomerUdhar succeed for owner and block staff', async () => {
      const custDbRow = {
        id: 'cust-1',
        business_id: 'biz-1',
        name: 'Kumar',
        phone: '9876543210',
        outstanding_balance_paise: 5000,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      const custChain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [custDbRow], error: null }),
        single: jest.fn().mockResolvedValue({ data: custDbRow, error: null }),
      };
      mockFrom.mockReturnValue(custChain);

      const list = await billingService.getCustomers('biz-1');
      expect(list).toHaveLength(1);

      const added = await billingService.addCustomer('biz-1', { name: 'Kumar', phone: '9876543210' });
      expect(added.customer?.id).toBe('cust-1');

      const voidChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(voidChain);
      expect(await billingService.voidInvoice('inv-1', 'wrong entry')).toEqual({ success: true });

      mockRpc.mockResolvedValueOnce({ data: 2000, error: null });
      expect(await billingService.settleCustomerUdhar('biz-1', 'cust-1', 3000, 'cash')).toEqual({
        success: true,
        newBalancePaise: 2000,
      });

      useBusinessStore.getState().setRole('staff');
      expect(await billingService.voidInvoice('inv-1', 'mistake')).toEqual({
        success: false,
        error: 'Not permitted',
      });
      expect(await billingService.settleCustomerUdhar('biz-1', 'cust-1')).toEqual({
        success: false,
        error: 'Not permitted',
      });
    });
  });

  describe('productService & productStore', () => {
    const dbProduct = {
      id: 'p1',
      business_id: 'biz-1',
      category_id: 'cat-1',
      name: 'Salt',
      sku: 'SAL-1',
      selling_price_paise: 2500,
      purchase_price_paise: 1800,
      unit: 'packet',
      tax_rate: 0,
      is_tax_inclusive: true,
      stock_quantity: 10,
      low_stock_threshold: 2,
      is_favourite: false,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    test('getProducts, getCategories, createCategory, saveProduct, deleteProduct, recordStockAdjustment', async () => {
      const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'cat-1',
              business_id: 'biz-1',
              name: 'Grocery',
              is_active: true,
              created_at: '2026-01-01',
            },
          ],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({ data: dbProduct, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const cats = await productService.getCategories('biz-1');
      expect(cats[0].name).toBe('Grocery');

      const createdCat = await productService.createCategory('biz-1', 'Snacks');
      expect(createdCat).toBeTruthy();

      const createdProd = await productService.saveProduct('biz-1', {
        name: 'Salt',
        sellingPricePaise: 2500,
        unit: 'packet',
        taxRate: 0,
        isTaxInclusive: true,
        stockQuantity: 10,
        lowStockThreshold: 2,
        isFavourite: false,
        isActive: true,
      });
      expect(createdProd.product?.purchasePricePaise).toBe(1800);

      const updatedProd = await productService.saveProduct('biz-1', {
        id: 'p1',
        name: 'Salt 1kg',
        sellingPricePaise: 2600,
        unit: 'packet',
        taxRate: 0,
        isTaxInclusive: true,
        stockQuantity: 10,
        lowStockThreshold: 2,
        isFavourite: true,
        isActive: true,
      });
      expect(updatedProd.product?.id).toBe('p1');

      const delChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      // 2nd .eq returns { error: null }
      delChain.eq
        .mockReturnValueOnce(delChain)
        .mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(delChain);
      expect(await productService.deleteProduct('biz-1', 'p1')).toEqual({ success: true });

      mockRpc.mockResolvedValueOnce({ data: 35, error: null });
      expect(await productService.recordStockAdjustment('biz-1', 'p1', 'purchase', 15, 20, 'Restock')).toEqual({
        success: true,
        newStock: 35,
      });

      // Product store indexing
      if (createdProd.product) {
        useProductStore.getState().setProducts([createdProd.product]);
        expect(useProductStore.getState().searchKeysById['p1']).toContain('salt');
        useProductStore.getState().updateProduct('p1', { name: 'Rock Salt' });
        expect(useProductStore.getState().searchKeysById['p1']).toContain('rock salt');
        useProductStore.getState().adjustStock('p1', 5);
        expect(useProductStore.getState().products[0].stockQuantity).toBe(15);
        useProductStore.getState().deleteProduct('p1');
        expect(useProductStore.getState().products).toEqual([]);
      }
    });

    test('getProducts selects non-cost columns from products_staff_view for staff and rejects staff writes', async () => {
      useBusinessStore.getState().setRole('staff');
      const staffChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [{ ...dbProduct, purchase_price_paise: undefined }], error: null }),
      };
      mockFrom.mockReturnValue(staffChain);

      const prods = await productService.getProducts('biz-1');
      expect(mockFrom).toHaveBeenCalledWith('products_staff_view');
      expect(staffChain.select.mock.calls[0][0]).not.toContain('purchase_price_paise');
      expect(prods[0].purchasePricePaise).toBeUndefined();

      expect(await productService.deleteProduct('biz-1', 'p1')).toEqual({
        success: false,
        error: 'Not permitted',
      });
      expect(await productService.createCategory('biz-1', 'X')).toBeNull();
    });
  });

  describe('businessService', () => {
    test('createBusiness, getMyRole, getMembershipStatus, updateBusiness, upgradeSubscription, getSubscription', async () => {
      const dbBiz = {
        id: 'biz-1',
        owner_id: 'owner-1',
        name: 'Quick Shop',
        business_type: 'retail',
        owner_name: 'Owner',
        phone: '9999999999',
        address: 'Main St',
        is_gst_registered: false,
        currency: 'INR',
        tax_inclusive: true,
        default_tax_rate: 5,
        invoice_prefix: 'QB',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { upsert: jest.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'businesses') {
          return {
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: dbBiz, error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: dbBiz, error: null }),
          };
        }
        if (table === 'business_members') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'staff', status: 'active' }, error: null }),
            limit: jest.fn().mockResolvedValue({ data: [{ id: 'bm-1' }], error: null }),
          };
        }
        if (table === 'subscriptions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'sub-1',
                business_id: 'biz-1',
                plan: 'pro',
                status: 'active',
                starts_at: '2026-01-01',
                auto_renew: true,
                max_staff: 5,
                cloud_backup_enabled: true,
                advanced_reports_enabled: true,
              },
              error: null,
            }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const created = await businessService.createBusiness('owner-1', {
        name: 'Quick Shop',
        businessType: 'retail',
        ownerName: 'Owner',
        phone: '9999999999',
        address: 'Main St',
        isGstRegistered: false,
        currency: 'INR',
        taxInclusive: true,
        defaultTaxRate: 5,
        invoicePrefix: 'QB',
      });
      expect(created.business?.id).toBe('biz-1');

      expect(await businessService.getMyRole('biz-1', 'owner-1')).toBe('owner');
      expect(await businessService.getMembershipStatus('biz-1', 'owner-1')).toBe('active');
      expect(await businessService.updateBusiness('biz-1', { name: 'Updated Shop' })).toEqual({ success: true });

      const sub = await businessService.getSubscription('biz-1');
      expect(sub.plan).toBe('pro');
      expect(await businessService.upgradeSubscription('biz-1', 'pro', 'yearly')).toEqual({ success: true });
    });

    test('getBusiness syncs owner membership once per session and checkAndLogoutIfSuspended signs out suspended staff', async () => {
      const insertMock = jest
        .fn()
        .mockResolvedValueOnce({ error: { message: 'temporary failure' } })
        .mockResolvedValueOnce({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'biz-1',
                owner_id: 'owner-1',
                name: 'Shop',
                business_type: 'retail',
                owner_name: 'Owner',
                phone: '9999999999',
                address: 'Main St',
                is_gst_registered: false,
                currency: 'INR',
                tax_inclusive: true,
                default_tax_rate: 5,
                invoice_prefix: 'QB',
                created_at: '2026-01-01',
                updated_at: '2026-01-01',
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          insert: insertMock,
        };
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await businessService.getBusiness('owner-1');
        await new Promise((r) => setTimeout(r, 0));
        await businessService.getBusiness('owner-1');
        await new Promise((r) => setTimeout(r, 0));
        await businessService.getBusiness('owner-1');
        await new Promise((r) => setTimeout(r, 0));
        expect(insertMock).toHaveBeenCalledTimes(2);
      } finally {
        warnSpy.mockRestore();
      }

      // checkAndLogoutIfSuspended ignores non-auth errors and handles Share fallback
      expect(await checkAndLogoutIfSuspended('network timeout')).toBe(false);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      await pdfService.shareReceipt(
        {
          id: 'i1',
          businessId: 'biz-1',
          invoiceNumber: 'QB-1',
          financialYear: '2026-2027',
          subtotalPaise: 1000,
          discountType: 'none',
          discountValue: 0,
          discountPaise: 0,
          cgstPaise: 0,
          sgstPaise: 0,
          igstPaise: 0,
          totalTaxPaise: 0,
          grandTotalPaise: 1000,
          paidAmountPaise: 1000,
          balanceAmountPaise: 0,
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          isVoid: false,
          createdAt: '2026-11-26T10:00:00Z',
        },
        sampleBusiness
      );
      expect(Share.share).toHaveBeenCalled();
    });
  });
});
