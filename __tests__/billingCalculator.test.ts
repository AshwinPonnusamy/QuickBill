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
import { CartItem, DiscountType } from '../types';

describe('QuickBill Billing Calculator & GST Engine', () => {
  describe('Money & Conversion Utilities', () => {
    test('converts paise to rupees accurately', () => {
      expect(paiseToRupees(100)).toBe(1.0);
      expect(paiseToRupees(1050)).toBe(10.5);
      expect(paiseToRupees(0)).toBe(0);
      expect(paiseToRupees(Number.NaN)).toBe(0);
    });

    test('converts decimal rupees to integer paise without floating point issues', () => {
      expect(rupeesToPaise(10.5)).toBe(1050);
      expect(rupeesToPaise(99.99)).toBe(9999);
      expect(rupeesToPaise(19.99)).toBe(1999);
      expect(rupeesToPaise(0)).toBe(0);
      expect(rupeesToPaise(Number.NaN)).toBe(0);
    });

    test('formats rupees in Indian numbering standard including ₹1,25,050.50', () => {
      expect(formatRupees(10050)).toBe('₹100.50');
      expect(formatRupees(12505050)).toBe('₹1,25,050.50');
      expect(formatRupees(10000000)).toBe('₹1,00,000.00');
      expect(formatRupees(12505050, false)).toBe('1,25,050.50');
    });

    test('generates current financial year on 31 Mar, 1 Apr, and 1 Jan boundaries', () => {
      expect(getCurrentFinancialYear(new Date(2026, 2, 31))).toBe('2025-2026'); // 31 Mar 2026
      expect(getCurrentFinancialYear(new Date(2026, 3, 1))).toBe('2026-2027');  // 1 Apr 2026
      expect(getCurrentFinancialYear(new Date(2027, 0, 1))).toBe('2026-2027');  // 1 Jan 2027
    });

    test('formats invoice number with prefix, FY and padded sequence', () => {
      expect(formatInvoiceNumber('QB', '2026-2027', 42)).toBe('QB-2627-0042');
      expect(formatInvoiceNumber('', '2026-2027', 1)).toBe('QB-2627-0001');
      expect(formatInvoiceNumber('SHOP', '2026', 9)).toBe('SHOP-2026-0009');
    });
  });

  describe('normalizeQuantity & Quantity Edge Cases', () => {
    test('normalizes 0, negative, NaN to 1 while preserving fractional quantities like 0.25', () => {
      expect(normalizeQuantity(0)).toBe(1);
      expect(normalizeQuantity(-3)).toBe(1);
      expect(normalizeQuantity(Number.NaN)).toBe(1);
      expect(normalizeQuantity(Infinity)).toBe(1);
      expect(normalizeQuantity(0.25)).toBe(0.25);
      expect(normalizeQuantity('2.5')).toBe(2.5);
    });

    test('uses normalized quantity in calculateItemTotals for 0, negative, NaN, and 0.25', () => {
      const base: CartItem = {
        id: 'rice',
        name: 'Rice',
        unit: 'kg',
        quantity: 0,
        unitPricePaise: 8000,
        taxRate: 0,
        isTaxInclusive: true,
      };
      expect(calculateItemTotals({ ...base, quantity: 0 }).subtotalPaise).toBe(8000);
      expect(calculateItemTotals({ ...base, quantity: -2 }).subtotalPaise).toBe(8000);
      expect(calculateItemTotals({ ...base, quantity: Number.NaN }).subtotalPaise).toBe(8000);
      expect(calculateItemTotals({ ...base, quantity: 0.25 }).subtotalPaise).toBe(2000);
    });
  });

  describe('Item GST Calculations (0/5/12/18/28%, Inclusive & Exclusive, CGST/SGST & IGST)', () => {
    const rates = [0, 5, 12, 18, 28];

    test.each(rates)('tax-exclusive calculation at %i%% GST preserves no-paise-lost invariant', (taxRate) => {
      const item: CartItem = {
        id: `ex-${taxRate}`,
        name: 'Product',
        unit: 'item',
        quantity: 1,
        unitPricePaise: 10100, // 101 rupees -> odd tax at 5% (505 paise)
        taxRate,
        isTaxInclusive: false,
      };

      const res = calculateItemTotals(item, 0, false);
      expect(res.taxableAmountPaise).toBe(10100);
      expect(res.cgstPaise + res.sgstPaise).toBe(res.totalTaxPaise);
      expect(res.igstPaise).toBe(0);
      expect(res.totalPaise).toBe(res.taxableAmountPaise + res.totalTaxPaise);
    });

    test.each(rates)('tax-inclusive calculation at %i%% GST preserves total == subtotal - discount', (taxRate) => {
      const item: CartItem = {
        id: `inc-${taxRate}`,
        name: 'Product',
        unit: 'item',
        quantity: 1,
        unitPricePaise: 10001,
        taxRate,
        isTaxInclusive: true,
      };

      const res = calculateItemTotals(item, 0, false);
      expect(res.totalPaise).toBe(10001);
      expect(res.taxableAmountPaise + res.totalTaxPaise).toBe(res.totalPaise);
      expect(res.cgstPaise + res.sgstPaise).toBe(res.totalTaxPaise);
    });

    test('splits odd tax paise without losing 1 paise (e.g. 505 -> 252 CGST + 253 SGST)', () => {
      const item: CartItem = {
        id: 'odd',
        name: 'Odd Tax Item',
        unit: 'item',
        quantity: 1,
        unitPricePaise: 10100,
        taxRate: 5,
        isTaxInclusive: false,
      };
      const res = calculateItemTotals(item, 0, false);
      expect(res.totalTaxPaise).toBe(505);
      expect(res.cgstPaise).toBe(252);
      expect(res.sgstPaise).toBe(253);
      expect(res.cgstPaise + res.sgstPaise).toBe(505);
    });

    test('calculates IGST for inter-state transaction with 0 CGST/SGST', () => {
      const item: CartItem = {
        id: 'igst',
        name: 'Textiles',
        unit: 'item',
        quantity: 1,
        unitPricePaise: 100000,
        taxRate: 12,
        isTaxInclusive: false,
      };

      const res = calculateItemTotals(item, 0, true);
      expect(res.igstPaise).toBe(12000);
      expect(res.totalTaxPaise).toBe(12000);
      expect(res.cgstPaise).toBe(0);
      expect(res.sgstPaise).toBe(0);
    });
  });

  describe('Full Bill Calculations, Discounts, Allocation & Rounding', () => {
    test('handles empty cart cleanly', () => {
      const bill = calculateBill([], 'percentage', 10, false);
      expect(bill.subtotalPaise).toBe(0);
      expect(bill.discountPaise).toBe(0);
      expect(bill.taxableSubtotalPaise).toBe(0);
      expect(bill.totalTaxPaise).toBe(0);
      expect(bill.roundOffPaise).toBe(0);
      expect(bill.grandTotalPaise).toBe(0);
      expect(bill.items).toEqual([]);
    });

    test('clamps percentage discount (0, 100, >100, negative)', () => {
      const items: CartItem[] = [
        { id: '1', name: 'A', unit: 'item', quantity: 1, unitPricePaise: 50000, taxRate: 0, isTaxInclusive: false },
      ];
      expect(calculateBill(items, 'percentage', 0).discountPaise).toBe(0);
      expect(calculateBill(items, 'percentage', -15).discountPaise).toBe(0);
      expect(calculateBill(items, 'percentage', 100).grandTotalPaise).toBe(0);
      expect(calculateBill(items, 'percentage', 150).discountPaise).toBe(50000);
      expect(calculateBill(items, 'percentage', 150).grandTotalPaise).toBe(0);
    });

    test('clamps fixed discount larger than subtotal to subtotal', () => {
      const items: CartItem[] = [
        { id: '1', name: 'A', unit: 'item', quantity: 1, unitPricePaise: 25000, taxRate: 18, isTaxInclusive: false },
      ];
      const bill = calculateBill(items, 'fixed', 999);
      expect(bill.discountPaise).toBe(25000);
      expect(bill.taxableSubtotalPaise).toBe(0);
      expect(bill.totalTaxPaise).toBe(0);
      expect(bill.grandTotalPaise).toBe(0);
    });

    test('allocates awkward rounding discount across 3 lines so sum of line discounts === bill discount', () => {
      const items: CartItem[] = [
        { id: '1', name: 'A', unit: 'item', quantity: 1, unitPricePaise: 333, taxRate: 5, isTaxInclusive: false },
        { id: '2', name: 'B', unit: 'item', quantity: 1, unitPricePaise: 333, taxRate: 12, isTaxInclusive: false },
        { id: '3', name: 'C', unit: 'item', quantity: 1, unitPricePaise: 2, taxRate: 18, isTaxInclusive: true },
      ];
      // Total gross = 668; discount ₹6.67 = 667 paise -> line 3 only has 2 paise gross!
      const bill = calculateBill(items, 'fixed', 6.67);
      const sumDiscounts = bill.items.reduce((s, it) => s + it.discountPaise, 0);
      expect(bill.discountPaise).toBe(667);
      expect(sumDiscounts).toBe(667);
      expect(bill.items[2].discountPaise).toBeLessThanOrEqual(2);
    });

    test('rounds grandTotal to nearest rupee with roundOff in [-50, +50] and exact financial identity', () => {
      const items: CartItem[] = [
        { id: '1', name: 'Snack', unit: 'packet', quantity: 1, unitPricePaise: 1049, taxRate: 5, isTaxInclusive: false },
      ];
      const bill = calculateBill(items, 'none', 0, false);
      expect(bill.roundOffPaise).toBeGreaterThanOrEqual(-50);
      expect(bill.roundOffPaise).toBeLessThanOrEqual(50);
      expect(bill.grandTotalPaise % 100).toBe(0);
      expect(bill.grandTotalPaise).toBe(bill.taxableSubtotalPaise + bill.totalTaxPaise + bill.roundOffPaise);
    });

    test('property test: 500 random carts always satisfy accounting, tax, discount & rounding invariants', () => {
      // Deterministic PRNG so test is reproducible
      let seed = 1337;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };

      const taxRates = [0, 5, 12, 18, 28];
      const discTypes: DiscountType[] = ['none', 'fixed', 'percentage'];

      for (let t = 0; t < 500; t++) {
        const lineCount = Math.floor(nextRand() * 8) + 1;
        const cart: CartItem[] = [];
        for (let i = 0; i < lineCount; i++) {
          const qtyChoices = [0, -1, 0.25, 0.5, 1, 2, 3.75, 10];
          const quantity = qtyChoices[Math.floor(nextRand() * qtyChoices.length)];
          cart.push({
            id: `rand-${t}-${i}`,
            name: `Item ${i}`,
            unit: 'item',
            quantity,
            unitPricePaise: Math.floor(nextRand() * 50000) + 1,
            taxRate: taxRates[Math.floor(nextRand() * taxRates.length)],
            isTaxInclusive: nextRand() > 0.5,
          });
        }

        const discountType = discTypes[Math.floor(nextRand() * discTypes.length)];
        const discountValue =
          discountType === 'percentage'
            ? Math.round(nextRand() * 120)
            : Math.round(nextRand() * 500 * 100) / 100;
        const isInterState = nextRand() > 0.5;

        const bill = calculateBill(cart, discountType, discountValue, isInterState);
        const sumLineDiscounts = bill.items.reduce((s, it) => s + it.discountPaise, 0);
        const sumLineSubtotals = bill.items.reduce((s, it) => s + it.subtotalPaise, 0);

        expect(sumLineSubtotals).toBe(bill.subtotalPaise);
        expect(sumLineDiscounts).toBe(bill.discountPaise);
        for (const line of bill.items) {
          expect(line.discountPaise).toBeGreaterThanOrEqual(0);
          expect(line.discountPaise).toBeLessThanOrEqual(line.subtotalPaise);
          expect(line.cgstPaise + line.sgstPaise + line.igstPaise).toBe(line.totalTaxPaise);
        }
        expect(bill.cgstPaise + bill.sgstPaise + bill.igstPaise).toBe(bill.totalTaxPaise);
        expect(bill.roundOffPaise).toBeGreaterThanOrEqual(-50);
        expect(bill.roundOffPaise).toBeLessThanOrEqual(50);
        expect(bill.grandTotalPaise % 100).toBe(0);
        expect(bill.grandTotalPaise).toBe(
          bill.taxableSubtotalPaise + bill.totalTaxPaise + bill.roundOffPaise
        );
      }
    });
  });
});
