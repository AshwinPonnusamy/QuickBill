import {
  paiseToRupees,
  rupeesToPaise,
  formatRupees,
  getCurrentFinancialYear,
  formatInvoiceNumber,
  calculateItemTotals,
  calculateBill,
  normalizeQuantity,
} from '../utils/billingCalculator';
import { CartItem } from '../types';

describe('QuickBill Billing Calculator & GST Engine', () => {
  describe('Money & Conversion Utilities', () => {
    test('converts paise to rupees accurately', () => {
      expect(paiseToRupees(100)).toBe(1.0);
      expect(paiseToRupees(1050)).toBe(10.5);
      expect(paiseToRupees(0)).toBe(0);
    });

    test('converts decimal rupees to integer paise without floating point issues', () => {
      expect(rupeesToPaise(10.5)).toBe(1050);
      expect(rupeesToPaise(99.99)).toBe(9999);
      expect(rupeesToPaise(0)).toBe(0);
    });

    test('formats rupees in Indian numbering standard', () => {
      expect(formatRupees(10050)).toBe('₹100.50');
      expect(formatRupees(10000000)).toBe('₹1,00,000.00'); // ₹1 Lakh
    });

    test('generates current financial year (April-March cycle)', () => {
      const novDate = new Date(2026, 10, 10); // Nov 2026
      expect(getCurrentFinancialYear(novDate)).toBe('2026-2027');

      const janDate = new Date(2027, 0, 15); // Jan 2027
      expect(getCurrentFinancialYear(janDate)).toBe('2026-2027');
    });

    test('formats invoice number with prefix, FY and padded sequence', () => {
      const invNum = formatInvoiceNumber('QB', '2026-2027', 42);
      expect(invNum).toBe('QB-2627-0042');
    });
  });

  describe('Item GST Calculations', () => {
    test('calculates 5% GST for tax-exclusive item', () => {
      const item: CartItem = {
        id: '1',
        name: 'Packaged Tea',
        unit: 'packet',
        quantity: 2,
        unitPricePaise: 10000, // ₹100 each = ₹200
        taxRate: 5,
        isTaxInclusive: false,
      };

      const result = calculateItemTotals(item, 0, false);
      expect(result.subtotalPaise).toBe(20000); // ₹200.00
      expect(result.taxableAmountPaise).toBe(20000);
      expect(result.totalTaxPaise).toBe(1000); // 5% of ₹200 = ₹10.00 (1000 paise)
      expect(result.cgstPaise).toBe(500); // ₹5.00
      expect(result.sgstPaise).toBe(500); // ₹5.00
      expect(result.igstPaise).toBe(0);
      expect(result.totalPaise).toBe(21000); // ₹210.00
    });

    test('calculates 5% GST for tax-inclusive retail item', () => {
      const item: CartItem = {
        id: '2',
        name: 'Chai / Tea',
        unit: 'cup',
        quantity: 1,
        unitPricePaise: 2100, // ₹21 inclusive of 5% tax
        taxRate: 5,
        isTaxInclusive: true,
      };

      const result = calculateItemTotals(item, 0, false);
      expect(result.totalPaise).toBe(2100);
      expect(result.taxableAmountPaise).toBe(2000); // ₹20.00
      expect(result.totalTaxPaise).toBe(100); // ₹1.00
      expect(result.cgstPaise).toBe(50);
      expect(result.sgstPaise).toBe(50);
    });

    test('calculates IGST for inter-state transaction', () => {
      const item: CartItem = {
        id: '3',
        name: 'Textiles',
        unit: 'item',
        quantity: 1,
        unitPricePaise: 100000, // ₹1,000
        taxRate: 12,
        isTaxInclusive: false,
      };

      const result = calculateItemTotals(item, 0, true); // isInterState = true
      expect(result.totalTaxPaise).toBe(12000); // ₹120.00
      expect(result.igstPaise).toBe(12000);
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
    });
  });

  describe('Full Bill Calculations & Discounts', () => {
    test('applies percentage discount and rounds off to nearest rupee', () => {
      const items: CartItem[] = [
        {
          id: '1',
          name: 'Item A',
          unit: 'item',
          quantity: 1,
          unitPricePaise: 50000, // ₹500
          taxRate: 0,
          isTaxInclusive: false,
        },
        {
          id: '2',
          name: 'Item B',
          unit: 'item',
          quantity: 1,
          unitPricePaise: 50000, // ₹500
          taxRate: 0,
          isTaxInclusive: false,
        },
      ];

      // 10% discount on ₹1,000 = ₹100 discount
      const bill = calculateBill(items, 'percentage', 10);
      expect(bill.subtotalPaise).toBe(100000);
      expect(bill.discountPaise).toBe(10000);
      expect(bill.grandTotalPaise).toBe(90000); // ₹900.00
    });

    test('applies fixed rupee discount correctly', () => {
      const items: CartItem[] = [
        {
          id: '1',
          name: 'Item A',
          unit: 'item',
          quantity: 1,
          unitPricePaise: 25000, // ₹250
          taxRate: 0,
          isTaxInclusive: false,
        },
      ];

      const bill = calculateBill(items, 'fixed', 50); // ₹50 off
      expect(bill.subtotalPaise).toBe(25000);
      expect(bill.discountPaise).toBe(5000); // 5000 paise
      expect(bill.grandTotalPaise).toBe(20000); // ₹200
    });

    test('normalizeQuantity handles 0, negative, NaN and preserves fractional quantities', () => {
      expect(normalizeQuantity(0)).toBe(1);
      expect(normalizeQuantity(-5)).toBe(1);
      expect(normalizeQuantity(Number.NaN)).toBe(1);
      expect(normalizeQuantity(0.25)).toBe(0.25);

      const zeroQtyItem: CartItem = {
        id: 'q0',
        name: 'Loose Rice',
        unit: 'kg',
        quantity: 0,
        unitPricePaise: 6000,
        taxRate: 0,
        isTaxInclusive: true,
      };
      expect(calculateItemTotals(zeroQtyItem).quantity).toBe(1);
      expect(calculateItemTotals({ ...zeroQtyItem, quantity: 0.25 }).subtotalPaise).toBe(1500);
    });

    test('discount allocation preserves sum(line discounts) === bill discount across 3 lines', () => {
      const items: CartItem[] = [
        { id: 'a', name: 'A', unit: 'item', quantity: 1, unitPricePaise: 1000, taxRate: 5, isTaxInclusive: false },
        { id: 'b', name: 'B', unit: 'item', quantity: 1, unitPricePaise: 1000, taxRate: 5, isTaxInclusive: false },
        { id: 'c', name: 'C', unit: 'item', quantity: 1, unitPricePaise: 2, taxRate: 5, isTaxInclusive: false },
      ];
      // Total gross = 2002; fixed discount ₹20.01 = 2001 paise -> line C gross is only 2 paise!
      const bill = calculateBill(items, 'fixed', 20.01);
      const sumLineDiscounts = bill.items.reduce((s, it) => s + it.discountPaise, 0);
      expect(bill.discountPaise).toBe(2001);
      expect(sumLineDiscounts).toBe(bill.discountPaise);
      for (const line of bill.items) {
        expect(line.discountPaise).toBeLessThanOrEqual(line.subtotalPaise);
      }
    });
  });
});

