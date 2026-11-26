const mockFrom = jest.fn();

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { reportService } from '../services/report.service';
import { useBusinessStore } from '../store/business.store';
import { Invoice } from '../types';

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  businessId: 'biz-1',
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
  paymentMethod: 'cash',
  isVoid: false,
  createdAt: '2026-11-26T10:00:00.000Z',
  ...overrides,
});

describe('reportService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-26T12:00:00.000Z'));
    useBusinessStore.getState().setRole('owner');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('handles empty invoice list cleanly', () => {
    const metrics = reportService.generateReport([], 'weekly');
    expect(metrics.totalRevenuePaise).toBe(0);
    expect(metrics.totalBills).toBe(0);
    expect(metrics.averageBillValuePaise).toBe(0);
    expect(metrics.topProducts).toEqual([]);
    expect(metrics.chartData.length).toBe(7);
  });

  test('distinguishes Walk-in variations from named customers and excludes voided invoices', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: '1', customerName: 'Walk-in Customer' }),
      makeInvoice({ id: '2', customerName: 'walk-in' }),
      makeInvoice({ id: '3', customerName: '' }),
      makeInvoice({ id: '4', customerName: 'Priya', customerId: 'c1', grandTotalPaise: 20000, paidAmountPaise: 20000 }),
      makeInvoice({ id: '5', customerName: 'Walk-in Customer', customerId: 'c2', grandTotalPaise: 5000, paidAmountPaise: 5000 }),
      makeInvoice({ id: '6', customerName: 'Voided User', isVoid: true, grandTotalPaise: 99900 }),
    ];

    const metrics = reportService.generateReport(invoices, 'daily');
    expect(metrics.totalBills).toBe(5);
    expect(metrics.walkInBillCount).toBe(3);
    expect(metrics.customerBillCount).toBe(2);
    expect(metrics.totalRevenuePaise).toBe(55000);
  });

  test('filters accurately across daily, weekly, and monthly windows', () => {
    const invoices: Invoice[] = [
      makeInvoice({ id: 'today', createdAt: '2026-11-26T08:00:00.000Z', grandTotalPaise: 10000 }),
      makeInvoice({ id: '3d-ago', createdAt: '2026-11-23T08:00:00.000Z', grandTotalPaise: 20000 }),
      makeInvoice({ id: '20d-ago', createdAt: '2026-11-06T08:00:00.000Z', grandTotalPaise: 30000 }),
      makeInvoice({ id: '60d-ago', createdAt: '2026-09-25T08:00:00.000Z', grandTotalPaise: 40000 }),
    ];

    expect(reportService.generateReport(invoices, 'daily').totalRevenuePaise).toBe(10000);
    expect(reportService.generateReport(invoices, 'weekly').totalRevenuePaise).toBe(30000);
    expect(reportService.generateReport(invoices, 'monthly').totalRevenuePaise).toBe(60000);
    expect(reportService.generateReport(invoices, 'all').totalRevenuePaise).toBe(100000);
  });

  test('orders topProducts by revenue descending and caps at top 10', () => {
    const items = Array.from({ length: 12 }, (_, idx) => ({
      productName: `Product ${idx + 1}`,
      unit: 'item' as const,
      quantity: 1,
      unitPricePaise: (idx + 1) * 1000,
      subtotalPaise: (idx + 1) * 1000,
      taxRate: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      taxPaise: 0,
      discountPaise: 0,
      totalPaise: (idx + 1) * 1000,
    }));

    const inv = makeInvoice({ items });
    const metrics = reportService.generateReport([inv], 'daily');

    expect(metrics.topProducts).toHaveLength(10);
    expect(metrics.topProducts[0].name).toBe('Product 12');
    expect(metrics.topProducts[0].revenuePaise).toBe(12000);
    expect(metrics.topProducts[9].name).toBe('Product 3');
  });

  test('prefers real payments table breakdown and falls back to 50/50 split when absent', () => {
    const splitReal = makeInvoice({
      id: 'real',
      paymentMethod: 'split',
      paidAmountPaise: 10000,
      payments: [
        { businessId: 'biz-1', amountPaise: 8000, paymentMethod: 'upi', status: 'completed' },
        { businessId: 'biz-1', amountPaise: 2000, paymentMethod: 'cash', status: 'completed' },
      ],
    });
    const splitFallback = makeInvoice({
      id: 'fallback',
      paymentMethod: 'split',
      paidAmountPaise: 1001,
      payments: undefined,
    });

    const metrics = reportService.generateReport([splitReal, splitFallback], 'daily');
    expect(metrics.cashPaymentsPaise).toBe(2000 + 501);
    expect(metrics.upiPaymentsPaise).toBe(8000 + 500);
  });

  test('getAuthorizedReport blocks staff and fetchReportForPeriod queries reports_daily_sales view', async () => {
    useBusinessStore.getState().setRole('staff');
    expect(reportService.getAuthorizedReport([], 'weekly')).toEqual({
      metrics: null,
      error: 'Not permitted',
    });

    useBusinessStore.getState().setRole('owner');
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        data: [
          {
            business_id: 'biz-1',
            day: '2026-11-26',
            bills: 4,
            revenue_paise: 40000,
            tax_paise: 2000,
            cgst_paise: 1000,
            sgst_paise: 1000,
            igst_paise: 0,
            discount_paise: 500,
            pending_udhar_paise: 1000,
            cash_paise: 15000,
            upi_paise: 24000,
            card_paise: 0,
          },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await reportService.fetchReportForPeriod('biz-1', 'weekly');
    expect(mockFrom).toHaveBeenCalledWith('reports_daily_sales');
    expect(res.metrics?.totalBills).toBe(4);
    expect(res.metrics?.cashPaymentsPaise).toBe(15000);
    expect(res.metrics?.upiPaymentsPaise).toBe(24000);
    expect(res.metrics?.averageBillValuePaise).toBe(10000);
  });
});
