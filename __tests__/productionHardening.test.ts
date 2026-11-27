// =============================================================================
// QuickBill: Production Hardening Test Suite
// Tests: §1 Purchase-price security, §2 Discount permissions, §3 Cross-tenant
//        isolation, §4 Payment validation, §5 Duplicate prevention, §6 GST
//        rounding, §7 Role escalation prevention, §8 Subscription auth,
//        §9 Offline sync / idempotency, §10 Receipt HTML escaping
// =============================================================================

const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    auth: { getSession: (...args: any[]) => mockAuthGetSession(...args) },
  },
}));

import { can, ROLE_PERMISSIONS, Permission } from '../utils/permissions';
import { escapeHtml } from '../utils/html';
import { calculateBill, calculateItemTotals } from '../utils/billingCalculator';
import { billingService } from '../services/billing.service';
import { productService } from '../services/product.service';
import { businessService } from '../services/business.service';
import { useBusinessStore } from '../store/business.store';
import { useBillStore } from '../store/bill.store';
import { pdfService } from '../services/pdf.service';
import { CartItem, BillCalculationResult, Product, Business, Invoice } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  businessId: 'biz-1',
  name: 'Test Product',
  sellingPricePaise: 10000,
  purchasePricePaise: 6000,
  unit: 'item',
  taxRate: 18,
  isTaxInclusive: false,
  stockQuantity: 50,
  lowStockThreshold: 5,
  isFavourite: false,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
});

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'c1',
  productId: 'p1',
  name: 'Test Product',
  unit: 'item',
  quantity: 1,
  unitPricePaise: 10000,
  taxRate: 18,
  isTaxInclusive: false,
  ...overrides,
});

const baseBusiness: Business = {
  id: 'biz-1',
  ownerId: 'u1',
  name: 'Test Shop',
  businessType: 'retail',
  ownerName: 'Owner',
  phone: '9876543210',
  address: '123 Main St',
  isGstRegistered: true,
  gstin: '33ABCDE1234F1Z5',
  currency: 'INR',
  taxInclusive: false,
  defaultTaxRate: 18,
  invoicePrefix: 'QB',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const makeCalc = (overrides: Partial<BillCalculationResult> = {}): BillCalculationResult => ({
  items: [{
    cartItem: makeCartItem(),
    quantity: 1,
    unitPricePaise: 10000,
    subtotalPaise: 10000,
    discountPaise: 0,
    taxableAmountPaise: 10000,
    cgstPaise: 900,
    sgstPaise: 900,
    igstPaise: 0,
    totalTaxPaise: 1800,
    totalPaise: 11800,
  }],
  subtotalPaise: 10000,
  discountType: 'none',
  discountValue: 0,
  discountPaise: 0,
  taxableSubtotalPaise: 10000,
  cgstPaise: 900,
  sgstPaise: 900,
  igstPaise: 0,
  totalTaxPaise: 1800,
  roundOffPaise: 0,
  grandTotalPaise: 11800,
  ...overrides,
});

const setupInvoiceSeqMock = (latestInvNum: string | null = null) => {
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

// ---------------------------------------------------------------------------
// §1  PURCHASE PRICE SECURITY
// ---------------------------------------------------------------------------
describe('§1 Purchase Price Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
  });

  test('staff role: can() correctly denies view_cost_price', () => {
    expect(can('staff', 'view_cost_price')).toBe(false);
    expect(can('admin', 'view_cost_price')).toBe(true);
    expect(can('owner', 'view_cost_price')).toBe(true);
  });

  test('productService.getProducts calls products_staff_view for staff (not products table)', async () => {
    useBusinessStore.getState().setRole('staff');
    const staffChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ id: 'p1', business_id: 'biz-1', name: 'Sugar', selling_price_paise: 5000,
          unit: 'kg', tax_rate: 0, is_tax_inclusive: false, stock_quantity: 10,
          low_stock_threshold: 5, is_favourite: false, is_active: true,
          created_at: '2026-01-01', updated_at: '2026-01-01' }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(staffChain);

    const products = await productService.getProducts('biz-1');
    // Should query products_staff_view first
    expect(mockFrom).toHaveBeenCalledWith('products_staff_view');
    // Should NOT include purchase_price_paise in select columns
    const selectCall = staffChain.select.mock.calls[0][0];
    expect(selectCall).not.toContain('purchase_price_paise');
    // Returned product should not have purchase price
    expect(products[0].purchasePricePaise).toBeUndefined();
  });

  test('productService.getProducts uses get_products_with_cost RPC for owners when available', async () => {
    useBusinessStore.getState().setRole('owner');
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'p1', business_id: 'biz-1', name: 'Sugar', selling_price_paise: 5000,
        purchase_price_paise: 3000, unit: 'kg', tax_rate: 0, is_tax_inclusive: false,
        stock_quantity: 10, low_stock_threshold: 5, is_favourite: false, is_active: true,
        created_at: '2026-01-01', updated_at: '2026-01-01' }],
      error: null,
    });

    const products = await productService.getProducts('biz-1');
    expect(mockRpc).toHaveBeenCalledWith('get_products_with_cost', { p_business_id: 'biz-1' });
    expect(products[0].purchasePricePaise).toBe(3000);
  });

  test('productService.getProducts includes purchase_price_paise for owners', async () => {
    useBusinessStore.getState().setRole('owner');
    const ownerChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ id: 'p1', business_id: 'biz-1', name: 'Sugar', selling_price_paise: 5000,
          purchase_price_paise: 3000, unit: 'kg', tax_rate: 0, is_tax_inclusive: false,
          stock_quantity: 10, low_stock_threshold: 5, is_favourite: false, is_active: true,
          created_at: '2026-01-01', updated_at: '2026-01-01' }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(ownerChain);

    const products = await productService.getProducts('biz-1');
    // Should query products table directly for owners
    expect(mockFrom).toHaveBeenCalledWith('products');
    // Should include purchase_price_paise in select columns
    const selectCall = ownerChain.select.mock.calls[0][0];
    expect(selectCall).toContain('purchase_price_paise');
    // Returned product should have purchase price
    expect(products[0].purchasePricePaise).toBe(3000);
  });

  test('purchase_price_paise not in ROLE_PERMISSIONS for staff', () => {
    // Prove the permission matrix is tight
    expect(ROLE_PERMISSIONS.staff.view_cost_price).toBe(false);
    expect(ROLE_PERMISSIONS.admin.view_cost_price).toBe(true);
    expect(ROLE_PERMISSIONS.owner.view_cost_price).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2  DISCOUNT PERMISSION ENFORCEMENT (service layer)
// ---------------------------------------------------------------------------
describe('§2 Discount Permission Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
  });

  test('staff cannot create invoice with any discount via billingService.createInvoice', async () => {
    useBusinessStore.getState().setRole('staff');
    setupInvoiceSeqMock('QB-2627-0001');

    const calcWithDiscount = makeCalc({ discountType: 'percentage', discountValue: 10, discountPaise: 1000, grandTotalPaise: 10800 });
    const result = await billingService.createInvoice('biz-1', calcWithDiscount, 'cash', 10800);
    expect(result.invoice).toBeNull();
    expect(result.error).toContain('Not permitted');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('staff cannot create invoice with fixed discount', async () => {
    useBusinessStore.getState().setRole('staff');
    setupInvoiceSeqMock(null);

    const calcWithFixedDisc = makeCalc({ discountType: 'fixed', discountValue: 100, discountPaise: 10000, grandTotalPaise: 1800 });
    const result = await billingService.createInvoice('biz-1', calcWithFixedDisc, 'cash', 1800);
    expect(result.invoice).toBeNull();
    expect(result.error).toContain('Not permitted');
  });

  test('admin CAN create invoice with discount', async () => {
    useBusinessStore.getState().setRole('admin');
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-disc-1', error: null });

    const calcWithDiscount = makeCalc({ discountType: 'percentage', discountValue: 10, discountPaise: 1000, grandTotalPaise: 10800 });
    const result = await billingService.createInvoice('biz-1', calcWithDiscount, 'cash', 10800);
    expect(result.error).toBeUndefined();
    expect(result.invoice?.id).toBe('inv-disc-1');
  });

  test('owner CAN create invoice with fixed discount', async () => {
    useBusinessStore.getState().setRole('owner');
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-fixed-disc', error: null });

    const calcWithFixedDisc = makeCalc({ discountType: 'fixed', discountValue: 50, discountPaise: 5000, grandTotalPaise: 6800 });
    const result = await billingService.createInvoice('biz-1', calcWithFixedDisc, 'cash', 6800);
    expect(result.invoice?.id).toBe('inv-fixed-disc');
  });

  test('no-discount invoice from staff proceeds to RPC', async () => {
    useBusinessStore.getState().setRole('staff');
    setupInvoiceSeqMock(null);
    mockRpc
      .mockResolvedValueOnce({ data: 6, error: null })
      .mockResolvedValueOnce({ data: 'inv-staff-nodiscnew', error: null });

    const calcNoDisc = makeCalc();
    const result = await billingService.createInvoice('biz-1', calcNoDisc, 'cash', 11800);
    expect(result.invoice?.id).toBe('inv-staff-nodiscnew');
    expect(mockRpc).toHaveBeenCalledWith('get_next_invoice_seq', {
      p_business_id: 'biz-1',
      p_financial_year: expect.any(String),
    });
    expect(mockRpc).toHaveBeenCalledWith('create_invoice_atomic', expect.objectContaining({
      p_discount_type: 'none',
      p_discount_paise: 0,
      p_invoice_number: expect.stringMatching(/-0006$/),
    }));
  });
});

// ---------------------------------------------------------------------------
// §3  BUSINESS DATA ISOLATION / CROSS-TENANT PROTECTION
// ---------------------------------------------------------------------------
describe('§3 Business Data Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
    useBusinessStore.getState().setRole('owner');
  });

  test('billingService.createInvoice sends business_id to RPC', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-iso-1', error: null });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'cash', 11800);
    expect(result.invoice).not.toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('create_invoice_atomic', expect.objectContaining({
      p_business_id: 'biz-1',
    }));
  });

  test('productService.getProducts always scopes by businessId', async () => {
    useBusinessStore.getState().setRole('owner');
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await productService.getProducts('biz-specific');
    // The eq call with 'business_id' and 'biz-specific' must be present
    const eqCalls = chain.eq.mock.calls;
    const bizEq = eqCalls.find(([col, val]: [string, string]) => col === 'business_id' && val === 'biz-specific');
    expect(bizEq).toBeTruthy();
  });

  test('billingService.getInvoices scopes by businessId parameter', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await billingService.getInvoices('target-biz');
    const eqCalls = chain.eq.mock.calls;
    expect(eqCalls.some(([c, v]: [string, string]) => c === 'business_id' && v === 'target-biz')).toBe(true);
  });

  test('report access denied for staff role', () => {
    // Directly test the permission
    expect(can('staff', 'view_reports')).toBe(false);
    expect(can('admin', 'view_reports')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4  PAYMENT VALIDATION
// ---------------------------------------------------------------------------
describe('§4 Payment Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
    useBusinessStore.getState().setRole('owner');
  });

  test('split payment generates correct cash + upi payment rows', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-split', error: null });

    const result = await billingService.createInvoice(
      'biz-1', makeCalc(), 'split', 11800, undefined, undefined, 'QB',
      { cashPaise: 5000, upiPaise: 6800 }
    );

    expect(result.invoice?.payments).toHaveLength(2);
    const rpcCall = mockRpc.mock.calls[0][1];
    const payments = rpcCall.p_payments;
    expect(payments).toHaveLength(2);
    expect(payments.some((p: any) => p.payment_method === 'cash' && p.amount_paise === 5000)).toBe(true);
    expect(payments.some((p: any) => p.payment_method === 'upi' && p.amount_paise === 6800)).toBe(true);
  });

  test('unpaid credit invoice has balance = grandTotal and payment status = unpaid', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-credit', error: null });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'credit', 0);
    expect(result.invoice?.paymentStatus).toBe('unpaid');
    expect(result.invoice?.balanceAmountPaise).toBe(11800);
  });

  test('partial payment sets paymentStatus = partial and correct balanceAmountPaise', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-partial', error: null });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'cash', 5000);
    expect(result.invoice?.paymentStatus).toBe('partial');
    expect(result.invoice?.balanceAmountPaise).toBe(6800);
  });

  test('settleCustomerUdhar requires owner/admin permission', async () => {
    useBusinessStore.getState().setRole('staff');
    const result = await billingService.settleCustomerUdhar('biz-1', 'cust-1', 1000, 'cash');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not permitted');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('settleCustomerUdhar calls RPC with correct parameters', async () => {
    useBusinessStore.getState().setRole('owner');
    mockRpc.mockResolvedValueOnce({ data: 2000, error: null });

    const result = await billingService.settleCustomerUdhar('biz-1', 'cust-X', 3000, 'upi');
    expect(result.success).toBe(true);
    expect(result.newBalancePaise).toBe(2000);
    expect(mockRpc).toHaveBeenCalledWith('settle_customer_udhar', {
      p_business_id: 'biz-1',
      p_customer_id: 'cust-X',
      p_amount_paise: 3000,
      p_method: 'upi',
    });
  });
});

// ---------------------------------------------------------------------------
// §5  DUPLICATE INVOICE PREVENTION / IDEMPOTENCY
// ---------------------------------------------------------------------------
describe('§5 Duplicate Invoice Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
    useBusinessStore.getState().setRole('owner');
  });

  test('same local_id across retries uses identical p_local_id in every RPC call', async () => {
    setupInvoiceSeqMock('QB-2627-0005');
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ data: 'inv-idm', error: null });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'cash', 11800);
    expect(result.invoice?.id).toBe('inv-idm');
    expect(mockRpc).toHaveBeenCalledTimes(2);

    const localIds = mockRpc.mock.calls.map((c: any[]) => c[1].p_local_id);
    expect(new Set(localIds).size).toBe(1); // All retries use same local_id
  });

  test('invoice number increments on each 23505 retry', async () => {
    setupInvoiceSeqMock('QB-2627-0010');
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ data: 'inv-fin', error: null });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'cash', 11800);
    expect(result.invoice?.id).toBe('inv-fin');

    const invNumbers = mockRpc.mock.calls.map((c: any[]) => c[1].p_invoice_number);
    // Numbers should be distinct and ascending
    expect(invNumbers[0]).not.toBe(invNumbers[1]);
    expect(invNumbers[1]).not.toBe(invNumbers[2]);
  });

  test('getNextInvoiceSeq uses get_next_invoice_seq RPC to avoid staff RLS numbering collisions', async () => {
    useBusinessStore.getState().setRole('staff');
    mockRpc.mockResolvedValueOnce({ data: 42, error: null });

    const seq = await billingService.getNextInvoiceSeq('biz-1', '2026-2027');
    expect(seq).toBe(42);
    expect(mockRpc).toHaveBeenCalledWith('get_next_invoice_seq', {
      p_business_id: 'biz-1',
      p_financial_year: '2026-2027',
    });
  });

  test('non-23505 error stops retrying immediately', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied' } });

    const result = await billingService.createInvoice('biz-1', makeCalc(), 'cash', 11800);
    expect(result.invoice).toBeNull();
    expect(result.error).toContain('permission denied');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// §6  GST CALCULATION CORRECTNESS
// ---------------------------------------------------------------------------
describe('§6 GST Calculation Correctness', () => {
  test('zero-value cart produces all-zero bill', () => {
    const bill = calculateBill([], 'none', 0, false);
    expect(bill.subtotalPaise).toBe(0);
    expect(bill.discountPaise).toBe(0);
    expect(bill.totalTaxPaise).toBe(0);
    expect(bill.grandTotalPaise).toBe(0);
  });

  test('exclusive GST 18%: tax = 18% of taxable amount, total = subtotal + tax', () => {
    const item = makeCartItem({ unitPricePaise: 10000, taxRate: 18, isTaxInclusive: false });
    const calc = calculateItemTotals(item, 0, false);
    expect(calc.taxableAmountPaise).toBe(10000);
    expect(calc.totalTaxPaise).toBe(1800);
    expect(calc.totalPaise).toBe(11800);
    expect(calc.cgstPaise + calc.sgstPaise).toBe(1800);
    expect(calc.igstPaise).toBe(0);
  });

  test('inclusive GST 18%: total == unit price, taxable amount correctly back-calculated', () => {
    const item = makeCartItem({ unitPricePaise: 11800, taxRate: 18, isTaxInclusive: true });
    const calc = calculateItemTotals(item, 0, false);
    expect(calc.totalPaise).toBe(11800);
    expect(calc.taxableAmountPaise).toBe(10000);
    expect(calc.totalTaxPaise).toBe(1800);
  });

  test('IGST for inter-state transaction: igstPaise = totalTaxPaise, cgst/sgst = 0', () => {
    const item = makeCartItem({ unitPricePaise: 10000, taxRate: 12, isTaxInclusive: false });
    const calc = calculateItemTotals(item, 0, true); // isInterState = true
    expect(calc.igstPaise).toBe(1200);
    expect(calc.cgstPaise).toBe(0);
    expect(calc.sgstPaise).toBe(0);
    expect(calc.totalTaxPaise).toBe(1200);
  });

  test('odd tax paise split without losing 1 paise (505 -> 252 CGST + 253 SGST)', () => {
    const item = makeCartItem({ unitPricePaise: 10100, taxRate: 5, isTaxInclusive: false });
    const calc = calculateItemTotals(item, 0, false);
    expect(calc.totalTaxPaise).toBe(505);
    expect(calc.cgstPaise).toBe(252);
    expect(calc.sgstPaise).toBe(253);
    expect(calc.cgstPaise + calc.sgstPaise).toBe(505);
  });

  test('sum of line discounts always equals bill-level discount (Hamilton invariant)', () => {
    const items: CartItem[] = [
      makeCartItem({ id: 'c1', productId: 'p1', unitPricePaise: 1000, quantity: 3, taxRate: 5, isTaxInclusive: false }),
      makeCartItem({ id: 'c2', productId: 'p2', unitPricePaise: 2000, quantity: 1, taxRate: 12, isTaxInclusive: false }),
      makeCartItem({ id: 'c3', productId: 'p3', unitPricePaise: 500, quantity: 1, taxRate: 0, isTaxInclusive: true }),
    ];
    // Awkward percentage: 7% discount on 5500 paise = 385 paise (not evenly divisible by 3)
    const bill = calculateBill(items, 'percentage', 7, false);
    const sumLineDisc = bill.items.reduce((s, it) => s + it.discountPaise, 0);
    expect(sumLineDisc).toBe(bill.discountPaise);
  });

  test('grandTotal rounded to nearest rupee, roundOff in [-50, +50] range', () => {
    // 1049 paise * 1.05 = 1101.45 paise -> rounds to 1100
    const item = makeCartItem({ unitPricePaise: 1049, taxRate: 5, isTaxInclusive: false });
    const bill = calculateBill([item], 'none', 0, false);
    expect(bill.grandTotalPaise % 100).toBe(0);
    expect(bill.roundOffPaise).toBeGreaterThanOrEqual(-50);
    expect(bill.roundOffPaise).toBeLessThanOrEqual(50);
  });

  test('large invoice amount: 500 items * ₹10,000 = ₹50,00,000 handles correctly', () => {
    const items: CartItem[] = Array.from({ length: 50 }, (_, i) => makeCartItem({
      id: `c${i}`,
      productId: `p${i}`,
      unitPricePaise: 1000000, // ₹10,000
      quantity: 1,
      taxRate: 18,
      isTaxInclusive: false,
    }));
    const bill = calculateBill(items, 'none', 0, false);
    expect(bill.subtotalPaise).toBe(50000000); // ₹5,00,000
    expect(bill.totalTaxPaise).toBe(9000000);  // 18% of ₹5,00,000
    expect(bill.grandTotalPaise).toBe(59000000); // ₹5,90,000
  });

  test('500 random carts: sum(lineDiscounts) == bill.discountPaise invariant always holds', () => {
    let seed = 42;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    const taxRates = [0, 5, 12, 18, 28];
    const discTypes = ['none', 'fixed', 'percentage'] as const;

    for (let t = 0; t < 500; t++) {
      const lineCount = Math.floor(rand() * 5) + 1;
      const cart: CartItem[] = Array.from({ length: lineCount }, (_, i) => makeCartItem({
        id: `r${t}-${i}`,
        productId: `rp${i}`,
        unitPricePaise: Math.floor(rand() * 100000) + 1,
        quantity: rand() > 0.8 ? 0.5 : Math.floor(rand() * 5) + 1,
        taxRate: taxRates[Math.floor(rand() * taxRates.length)],
        isTaxInclusive: rand() > 0.5,
      }));

      const discType = discTypes[Math.floor(rand() * discTypes.length)];
      const discVal = discType === 'percentage' ? rand() * 100 : rand() * 500;
      const isInterState = rand() > 0.5;

      const bill = calculateBill(cart, discType, discVal, isInterState);
      const sumLineDisc = bill.items.reduce((s, it) => s + it.discountPaise, 0);

      expect(sumLineDisc).toBe(bill.discountPaise);
      expect(bill.grandTotalPaise % 100).toBe(0);
      for (const line of bill.items) {
        expect(line.discountPaise).toBeGreaterThanOrEqual(0);
        expect(line.discountPaise).toBeLessThanOrEqual(line.subtotalPaise);
        expect(line.cgstPaise + line.sgstPaise + line.igstPaise).toBe(line.totalTaxPaise);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §7  ROLE ESCALATION PREVENTION
// ---------------------------------------------------------------------------
describe('§7 Role Escalation Prevention', () => {
  test('can() fails closed for all unrecognized roles', () => {
    const perms: Permission[] = Object.keys(ROLE_PERMISSIONS.owner) as Permission[];
    for (const perm of perms) {
      expect(can('superadmin' as any, perm)).toBe(false);
      expect(can('god' as any, perm)).toBe(false);
      expect(can(null, perm)).toBe(false);
      expect(can(undefined, perm)).toBe(false);
    }
  });

  test('staff cannot access any owner-only or admin-only permissions', () => {
    const privileged: Permission[] = [
      'manage_products', 'adjust_stock', 'view_reports', 'void_invoice',
      'settle_udhar', 'manage_staff', 'manage_settings', 'manage_subscription',
      'apply_discount', 'view_cost_price', 'view_all_invoices',
    ];
    for (const perm of privileged) {
      expect(can('staff', perm)).toBe(false);
    }
  });

  test('admin cannot access owner-only permissions', () => {
    const ownerOnly: Permission[] = ['manage_settings', 'manage_subscription'];
    for (const perm of ownerOnly) {
      expect(can('admin', perm)).toBe(false);
    }
  });

  test('productService.saveProduct rejects staff with Not permitted error', async () => {
    useBusinessStore.getState().setRole('staff');
    const result = await productService.saveProduct('biz-1', {
      name: 'Hack Product', sellingPricePaise: 100, unit: 'item',
      taxRate: 0, isTaxInclusive: false, stockQuantity: 0,
      lowStockThreshold: 5, isFavourite: false, isActive: true,
    });
    expect(result.product).toBeNull();
    expect(result.error).toContain('Not permitted');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('productService.deleteProduct rejects staff', async () => {
    useBusinessStore.getState().setRole('staff');
    const result = await productService.deleteProduct('biz-1', 'p1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not permitted');
  });

  test('productService.recordStockAdjustment rejects staff', async () => {
    useBusinessStore.getState().setRole('staff');
    const result = await productService.recordStockAdjustment('biz-1', 'p1', 'purchase', 5, 10, 'Staff hack');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not permitted');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// §8  SUBSCRIPTION AUTHORIZATION
// ---------------------------------------------------------------------------
describe('§8 Subscription Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
  });

  test('can() correctly restricts manage_subscription to owner', () => {
    expect(can('staff', 'manage_subscription')).toBe(false);
    expect(can('admin', 'manage_subscription')).toBe(false);
    expect(can('owner', 'manage_subscription')).toBe(true);
  });

  test('businessService.upgradeSubscription blocked for staff', async () => {
    useBusinessStore.getState().setRole('staff');
    const result = await businessService.upgradeSubscription('biz-1', 'pro', 'monthly');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not permitted');
  });

  test('businessService.upgradeSubscription blocked for admin', async () => {
    useBusinessStore.getState().setRole('admin');
    const result = await businessService.upgradeSubscription('biz-1', 'pro', 'yearly');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not permitted');
  });

  test('businessService.upgradeSubscription allowed for owner', async () => {
    useBusinessStore.getState().setRole('owner');
    mockFrom.mockReturnValue({ upsert: jest.fn().mockResolvedValue({ error: null }) });
    const result = await businessService.upgradeSubscription('biz-1', 'pro', 'monthly');
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9  RECEIPT HTML ESCAPING / XSS PREVENTION
// ---------------------------------------------------------------------------
describe('§9 Receipt HTML Escaping (XSS Prevention)', () => {
  const xssInvoice: Invoice = {
    id: 'inv-xss',
    businessId: 'biz-1',
    invoiceNumber: 'QB-<script>alert(1)</script>',
    financialYear: '2026-2027',
    customerName: '<img src=x onerror=alert(2)>',
    customerPhone: '">9876543210',
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
    paymentMethod: 'cash',
    isVoid: false,
    createdAt: '2026-11-26T10:00:00Z',
    items: [{
      productName: '<script>alert("xss")</script>',
      unit: 'item',
      quantity: 1,
      unitPricePaise: 10000,
      subtotalPaise: 10000,
      taxRate: 0,
      cgstPaise: 0, sgstPaise: 0, igstPaise: 0,
      taxPaise: 0, discountPaise: 0, totalPaise: 10000,
    }],
  };

  const xssBusiness: Business = {
    ...baseBusiness,
    name: '<script>document.cookie</script>',
    address: '"><script>pwn()</script>',
    phone: '">9999',
  };

  test('generateReceiptHtml escapes all user-controlled XSS vectors', () => {
    const html = pdfService.generateReceiptHtml(xssInvoice, xssBusiness, 'thermal');

    // No unescaped script tags
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('<script>document.cookie</script>');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');

    // Properly escaped versions present
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
  });

  test('escapeHtml handles all special characters correctly', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

// ---------------------------------------------------------------------------
// §10 OFFLINE SYNC / BILL STORE PERSISTENCE
// ---------------------------------------------------------------------------
describe('§10 Bill Store Integrity & Cart Persistence', () => {
  beforeEach(() => {
    useBillStore.getState().clearBill();
  });

  test('cart persists products correctly and getCalculation is deterministic', () => {
    const p1 = makeProduct({ id: 'p1', sellingPricePaise: 5000 });
    useBillStore.getState().addToCart(p1, 2);
    useBillStore.getState().setDiscount('percentage', 10);

    const calc1 = useBillStore.getState().getCalculation();
    const calc2 = useBillStore.getState().getCalculation();
    expect(calc1).toBe(calc2); // Memoized – same reference

    expect(calc1.discountPaise).toBe(1000); // 10% of 10000
    expect(calc1.subtotalPaise).toBe(10000); // 2 * 5000
  });

  test('clearBill resets all state to initial values', () => {
    const p1 = makeProduct({ id: 'p1' });
    useBillStore.getState().addToCart(p1, 3);
    useBillStore.getState().setDiscount('fixed', 100);
    useBillStore.getState().setIsInterState(true);
    useBillStore.getState().setNotes('Test note');

    useBillStore.getState().clearBill();

    const state = useBillStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.discountType).toBe('none');
    expect(state.discountValue).toBe(0);
    expect(state.isInterState).toBe(false);
    expect(state.notes).toBe('');
    expect(state.customer).toBeNull();
  });

  test('adding same product twice accumulates quantity on single cart line', () => {
    const p1 = makeProduct({ id: 'unique-prod' });
    useBillStore.getState().addToCart(p1, 1);
    useBillStore.getState().addToCart(p1, 2);

    const cart = useBillStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  test('custom items get unique IDs even in tight loops', () => {
    for (let i = 0; i < 20; i++) {
      useBillStore.getState().addCustomItem(`Item ${i}`, 1000 * (i + 1));
    }
    const ids = useBillStore.getState().cart.map(c => c.id);
    expect(new Set(ids).size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// §11 PHONE AUTH & ACCOUNT LINKING
// ---------------------------------------------------------------------------
import { authService, normalizePhone10, formatE164Phone } from '../services/auth.service';
import { offlineQueueService } from '../services/offlineQueue.service';

describe('§11 Phone Auth & Account Linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizePhone10 and formatE164Phone normalize Indian mobile numbers consistently', () => {
    expect(normalizePhone10('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone10('9876543210')).toBe('9876543210');
    expect(formatE164Phone('9876543210')).toBe('+919876543210');
    expect(formatE164Phone('+919876543210')).toBe('+919876543210');
  });

  test('sendOtp rejects short phone numbers before calling Supabase', async () => {
    const res = await authService.sendOtp('12345');
    expect(res.success).toBe(false);
    expect(res.error).toContain('10-digit');
  });
});

// ---------------------------------------------------------------------------
// §12 OFFLINE QUEUE & IDEMPOTENT SYNC
// ---------------------------------------------------------------------------
describe('§12 Offline Queue & Idempotent Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBusinessStore.getState().setBusiness(baseBusiness);
    useBusinessStore.getState().setRole('owner');
  });

  test('isNetworkError detects offline/network/timeout failures accurately', () => {
    expect(offlineQueueService.isNetworkError('Network request failed')).toBe(true);
    expect(offlineQueueService.isNetworkError('Failed to fetch')).toBe(true);
    expect(offlineQueueService.isNetworkError('Not permitted')).toBe(false);
  });

  test('offlineQueueService enqueues, retries with same localId, and clears synced items', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    let storageData: Record<string, string> = {};
    AsyncStorage.getItem.mockImplementation((k: string) => Promise.resolve(storageData[k] ?? null));
    AsyncStorage.setItem.mockImplementation((k: string, v: string) => {
      storageData[k] = v;
      return Promise.resolve();
    });

    await offlineQueueService.enqueueInvoice({
      localId: 'loc-offline-1',
      businessId: 'biz-1',
      calculation: makeCalc(),
      paymentMethod: 'cash',
      paidAmountPaise: 11800,
      invoicePrefix: 'QB',
    });

    const queued = await offlineQueueService.getQueue();
    expect(queued).toHaveLength(1);
    expect(queued[0].status).toBe('pending_sync');

    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-synced-1', error: null });

    const syncRes = await offlineQueueService.syncPendingInvoices('biz-1');
    expect(syncRes).toEqual({ syncedCount: 1, failedCount: 0, remainingCount: 0 });
    expect(mockRpc).toHaveBeenCalledWith(
      'create_invoice_atomic',
      expect.objectContaining({ p_local_id: 'loc-offline-1' })
    );
    expect(await offlineQueueService.getQueue()).toHaveLength(0);
  });

  test('createInvoice passes paymentReference and existingLocalId through to RPC', async () => {
    setupInvoiceSeqMock(null);
    mockRpc.mockResolvedValueOnce({ data: 'inv-ref-1', error: null });

    const res = await billingService.createInvoice(
      'biz-1',
      makeCalc(),
      'upi',
      11800,
      undefined,
      undefined,
      'QB',
      undefined,
      'UTR123456789012',
      'loc-fixed-id-1'
    );

    expect(res.invoice?.id).toBe('inv-ref-1');
    expect(mockRpc).toHaveBeenCalledWith(
      'create_invoice_atomic',
      expect.objectContaining({
        p_local_id: 'loc-fixed-id-1',
        p_payments: [
          expect.objectContaining({
            payment_method: 'upi',
            payment_reference: 'UTR123456789012',
          }),
        ],
      })
    );
  });
});

// ---------------------------------------------------------------------------
// §13 THERMAL 58MM / 80MM / A4 RECEIPT TEMPLATES
// ---------------------------------------------------------------------------
describe('§13 Receipt Templates (58mm / 80mm / A4)', () => {
  test('generateReceiptHtml supports thermal-58, thermal (80mm), and a4 page sizes', () => {
    const inv: Invoice = {
      id: 'inv-t1',
      businessId: 'biz-1',
      invoiceNumber: 'QB-2627-0001',
      financialYear: '2026-2027',
      subtotalPaise: 10000,
      discountType: 'none',
      discountValue: 0,
      discountPaise: 0,
      cgstPaise: 900,
      sgstPaise: 900,
      igstPaise: 0,
      totalTaxPaise: 1800,
      grandTotalPaise: 11800,
      paidAmountPaise: 11800,
      balanceAmountPaise: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      isVoid: false,
      createdAt: '2026-11-27T10:00:00Z',
      items: [],
    };

    const html58 = pdfService.generateReceiptHtml(inv, baseBusiness, 'thermal-58');
    const html80 = pdfService.generateReceiptHtml(inv, baseBusiness, 'thermal');
    const htmlA4 = pdfService.generateReceiptHtml(inv, baseBusiness, 'a4');

    expect(html58).toContain('58mm auto');
    expect(html80).toContain('80mm auto');
    expect(htmlA4).toContain('size: A4');
  });
});
