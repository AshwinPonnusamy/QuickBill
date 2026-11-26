const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('react-native', () => ({ Share: { share: jest.fn() } }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: '/tmp' } }));
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { useBillStore } from '../store/bill.store';
import { useBusinessStore } from '../store/business.store';
import { reportService } from '../services/report.service';
import { escapeHtml } from '../utils/html';
import { pdfService } from '../services/pdf.service';
import { billingService } from '../services/billing.service';
import { productService } from '../services/product.service';
import { businessService, clearSyncedMembershipsCache } from '../services/business.service';
import { Business, Invoice, Product } from '../types';

const sampleProduct: Product = {
  id: 'p1',
  businessId: 'b1',
  name: 'Sugar 1kg',
  sellingPricePaise: 5000,
  unit: 'kg',
  taxRate: 5,
  isTaxInclusive: true,
  stockQuantity: 20,
  lowStockThreshold: 5,
  isFavourite: false,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

const sampleBusiness: Business = {
  id: 'b1',
  ownerId: 'u1',
  name: 'Sharma <Shop> & Co',
  businessType: 'retail',
  ownerName: 'R. Sharma',
  phone: '9876543210',
  address: '12 "Main" St & \'Cross\'',
  isGstRegistered: false,
  currency: 'INR',
  taxInclusive: true,
  defaultTaxRate: 5,
  invoicePrefix: 'QB',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

describe('Section 1 Correctness Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBillStore.getState().clearBill();
    useBusinessStore.getState().setBusiness(sampleBusiness);
    useBusinessStore.getState().setRole('owner');
    clearSyncedMembershipsCache();
  });

  test('bill.store: addToCart is immutable, custom items have unique ids, and getCalculation is memoized', () => {
    const store = useBillStore.getState();
    store.addToCart(sampleProduct, 1);
    const firstItemRef = useBillStore.getState().cart[0];
    const calc1 = useBillStore.getState().getCalculation();
    const calc2 = useBillStore.getState().getCalculation();
    expect(calc1).toBe(calc2);

    store.addToCart(sampleProduct, 1);
    const updatedItemRef = useBillStore.getState().cart[0];
    expect(firstItemRef.quantity).toBe(1);
    expect(updatedItemRef.quantity).toBe(2);
    expect(updatedItemRef).not.toBe(firstItemRef);
    expect(useBillStore.getState().getCalculation()).not.toBe(calc1);

    store.addCustomItem('Custom A', 1000);
    store.addCustomItem('Custom B', 2000);
    const ids = useBillStore.getState().cart.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('report.service: classifies Walk-in Customer accurately and prefers real payments over 50/50 split', () => {
    const nowIso = new Date().toISOString();
    const invWalkIn: Invoice = {
      id: 'i1',
      businessId: 'b1',
      invoiceNumber: 'QB-2627-0001',
      financialYear: '2026-2027',
      customerName: 'Walk-in Customer',
      subtotalPaise: 10000,
      discountType: 'none',
      discountValue: 0,
      discountPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalTaxPaise: 0,
      grandTotalPaise: 10000,
      paidAmountPaise: 10000,
      balanceAmountPaise: 0,
      paymentStatus: 'paid',
      paymentMethod: 'split',
      isVoid: false,
      createdAt: nowIso,
      payments: [
        { businessId: 'b1', amountPaise: 7000, paymentMethod: 'cash', status: 'completed' },
        { businessId: 'b1', amountPaise: 3000, paymentMethod: 'upi', status: 'completed' },
      ],
    };

    const metrics = reportService.generateReport([invWalkIn], 'daily');
    expect(metrics.walkInBillCount).toBe(1);
    expect(metrics.customerBillCount).toBe(0);
    expect(metrics.cashPaymentsPaise).toBe(7000);
    expect(metrics.upiPaymentsPaise).toBe(3000);
  });

  test('pdf.service & escapeHtml: escapes &, <, >, ", \' in HTML receipt output', () => {
    expect(escapeHtml(`<b title="x">'&`)).toBe('&lt;b title=&quot;x&quot;&gt;&#39;&amp;');
    const html = pdfService.generateReceiptHtml(
      {
        id: 'i2',
        businessId: 'b1',
        invoiceNumber: 'QB<1>',
        financialYear: '2026-2027',
        customerName: 'O\'Brien & Sons',
        subtotalPaise: 5000,
        discountType: 'none',
        discountValue: 0,
        discountPaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        totalTaxPaise: 0,
        grandTotalPaise: 5000,
        paidAmountPaise: 5000,
        balanceAmountPaise: 0,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        isVoid: false,
        createdAt: '2026-11-26T10:00:00Z',
        items: [
          {
            productName: '<script>alert(1)</script>',
            unit: 'item',
            quantity: 1,
            unitPricePaise: 5000,
            subtotalPaise: 5000,
            taxRate: 0,
            cgstPaise: 0,
            sgstPaise: 0,
            igstPaise: 0,
            taxPaise: 0,
            discountPaise: 0,
            totalPaise: 5000,
          },
        ],
      },
      sampleBusiness
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Sharma &lt;Shop&gt; &amp; Co');
    expect(html).toContain('O&#39;Brien &amp; Sons');
  });

  test('billing.service: retries createInvoice on 23505 reusing localId, and calls settle_customer_udhar RPC', async () => {
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ invoice_number: 'QB-2627-0005' }] }),
    };
    mockFrom.mockReturnValue(queryChain);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ data: 'inv-999', error: null });

    useBillStore.getState().addToCart(sampleProduct, 1);
    const calc = useBillStore.getState().getCalculation();
    const res = await billingService.createInvoice('b1', calc, 'cash', calc.grandTotalPaise);

    expect(res.invoice?.id).toBe('inv-999');
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[0][1].p_local_id).toBe(mockRpc.mock.calls[1][1].p_local_id);
    expect(mockRpc.mock.calls[0][1].p_invoice_number).not.toBe(mockRpc.mock.calls[1][1].p_invoice_number);

    mockRpc.mockResolvedValueOnce({ data: 0, error: null });
    const settleRes = await billingService.settleCustomerUdhar('b1', 'cust-1', 1500, 'upi');
    expect(settleRes.success).toBe(true);
    expect(mockRpc).toHaveBeenLastCalledWith('settle_customer_udhar', {
      p_business_id: 'b1',
      p_customer_id: 'cust-1',
      p_amount_paise: 1500,
      p_method: 'upi',
    });
  });

  test('product.service & business.service: adjust_stock RPC and one-time session sync', async () => {
    mockRpc.mockResolvedValueOnce({ data: 25, error: null });
    const adj = await productService.recordStockAdjustment('b1', 'p1', 'purchase', 5, 20, 'Restock');
    expect(adj).toEqual({ success: true, newStock: 25 });
    expect(mockRpc).toHaveBeenCalledWith('adjust_stock', {
      p_business_id: 'b1',
      p_product_id: 'p1',
      p_movement_type: 'purchase',
      p_quantity: 5,
      p_reason: 'Restock',
    });

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'businesses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'b1',
              owner_id: 'u1',
              name: 'Shop',
              business_type: 'retail',
              owner_name: 'Owner',
              phone: '9999999999',
              address: 'Addr',
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

    await businessService.getBusiness('u1');
    await Promise.resolve();
    await Promise.resolve();
    await businessService.getBusiness('u1');
    await Promise.resolve();

    const bmSelectCalls = mockFrom.mock.calls.filter((c) => c[0] === 'business_members').length;
    expect(bmSelectCalls).toBeLessThanOrEqual(2);
  });
});
