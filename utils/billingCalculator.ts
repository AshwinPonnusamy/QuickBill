import {
  CartItem,
  CalculatedItem,
  BillCalculationResult,
  DiscountType,
} from '../types';

/**
 * Normalizes a quantity value: returns finite numbers > 0 (including fractions like 0.25),
 * falling back to 1 for 0, negative, or non-finite values.
 */
export function normalizeQuantity(quantity: unknown): number {
  const num = Number(quantity);
  if (Number.isFinite(num) && num > 0) {
    return num;
  }
  return 1;
}

/**
 * Converts integer paise to decimal rupees.
 * E.g., 1050 paise -> 10.50
 */
export function paiseToRupees(paise: number): number {
  if (!paise || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Converts decimal rupees to integer paise.
 * E.g., 10.50 rupees -> 1050 paise
 */
export function rupeesToPaise(rupees: number): number {
  if (!rupees || isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Formats integer paise into standard Indian Rupee notation.
 * E.g., 125050 paise -> ₹1,250.50
 */
export function formatRupees(paise: number, showSymbol: boolean = true): string {
  const rupees = paiseToRupees(paise);
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Returns Indian Financial Year string (April 1 to March 31).
 * E.g., November 2026 -> "2026-2027"
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: Jan=0, Mar=2, Apr=3
  const year = date.getFullYear();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Formats an invoice number with prefix and sequential number.
 * E.g., QB-202627-0001
 */
export function formatInvoiceNumber(prefix: string, fy: string, seq: number): string {
  const parts = fy.split('-');
  const shortFy = parts.length === 2 ? `${parts[0].slice(-2)}${parts[1].slice(-2)}` : fy;
  const paddedSeq = String(seq).padStart(4, '0');
  return `${prefix || 'QB'}-${shortFy}-${paddedSeq}`;
}

/**
 * Calculates item totals, handling tax inclusive / exclusive models,
 * item discounts, and CGST/SGST splitting.
 */
export function calculateItemTotals(
  cartItem: CartItem,
  itemDiscountPaise: number = 0,
  isInterState: boolean = false,
  precomputedGrossPaise?: number
): CalculatedItem {
  const qty = normalizeQuantity(cartItem.quantity);
  const unitPrice = Math.max(0, Math.round(Number(cartItem.unitPricePaise) || 0));
  const grossSubtotalPaise =
    precomputedGrossPaise !== undefined
      ? precomputedGrossPaise
      : Math.round(qty * unitPrice);

  const safeDiscountInput = Number.isFinite(itemDiscountPaise) ? itemDiscountPaise : 0;
  const discountPaise = Math.min(grossSubtotalPaise, Math.max(0, Math.round(safeDiscountInput)));
  const effectiveSubtotalPaise = grossSubtotalPaise - discountPaise;

  const taxRate = Math.max(0, Number(cartItem.taxRate) || 0);
  let taxableAmountPaise = 0;
  let totalTaxPaise = 0;
  let totalPaise = 0;

  if (taxRate <= 0) {
    taxableAmountPaise = effectiveSubtotalPaise;
    totalTaxPaise = 0;
    totalPaise = effectiveSubtotalPaise;
  } else if (cartItem.isTaxInclusive) {
    taxableAmountPaise = Math.round(effectiveSubtotalPaise / (1 + taxRate / 100));
    totalTaxPaise = effectiveSubtotalPaise - taxableAmountPaise;
    totalPaise = effectiveSubtotalPaise;
  } else {
    taxableAmountPaise = effectiveSubtotalPaise;
    totalTaxPaise = Math.round((taxableAmountPaise * taxRate) / 100);
    totalPaise = taxableAmountPaise + totalTaxPaise;
  }

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isInterState) {
    igstPaise = totalTaxPaise;
  } else {
    cgstPaise = Math.floor(totalTaxPaise / 2);
    sgstPaise = totalTaxPaise - cgstPaise; // avoids loss of 1 paise
  }

  return {
    cartItem,
    quantity: qty,
    unitPricePaise: unitPrice,
    subtotalPaise: grossSubtotalPaise,
    discountPaise,
    taxableAmountPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    totalPaise,
  };
}

/**
 * Proportionally allocates `totalDiscountPaise` across line grosses without
 * exceeding any line's gross, redistributing rounding remainders so the
 * sum of line discounts equals `totalDiscountPaise` whenever totalDiscount <= subtotal.
 */
function allocateDiscountsAcrossLines(
  lineGrosses: number[],
  subtotalPaise: number,
  totalDiscountPaise: number
): number[] {
  const shares = new Array<number>(lineGrosses.length).fill(0);
  if (lineGrosses.length === 0 || subtotalPaise <= 0 || totalDiscountPaise <= 0) {
    return shares;
  }

  const target = Math.min(subtotalPaise, totalDiscountPaise);
  let allocated = 0;

  for (let i = 0; i < lineGrosses.length; i++) {
    const base = Math.min(
      lineGrosses[i],
      Math.floor((lineGrosses[i] * target) / subtotalPaise)
    );
    shares[i] = base;
    allocated += base;
  }

  let remainder = target - allocated;
  if (remainder > 0) {
    // Prioritize lines with largest fractional quota remainders (Hamilton apportionment)
    const rankedIndices = lineGrosses
      .map((gross, idx) => ({
        idx,
        room: gross - shares[idx],
        frac: (gross * target) % subtotalPaise,
      }))
      .filter((entry) => entry.room > 0)
      .sort((a, b) => b.frac - a.frac || a.idx - b.idx);

    for (const entry of rankedIndices) {
      if (remainder <= 0) break;
      const room = lineGrosses[entry.idx] - shares[entry.idx];
      if (room > 0) {
        const take = Math.min(room, 1, remainder);
        shares[entry.idx] += take;
        remainder -= take;
      }
    }

    // Defensive pass in case multiple paise of room remain on fewer lines
    if (remainder > 0) {
      for (let i = lineGrosses.length - 1; i >= 0 && remainder > 0; i--) {
        const room = lineGrosses[i] - shares[i];
        if (room > 0) {
          const take = Math.min(room, remainder);
          shares[i] += take;
          remainder -= take;
        }
      }
    }
  }

  return shares;
}

/**
 * Calculates complete bill total including line items, cart-level discounts,
 * itemized GST taxes, and rupee rounding.
 */
export function calculateBill(
  cartItems: CartItem[],
  discountType: DiscountType = 'none',
  discountValue: number = 0,
  isInterState: boolean = false
): BillCalculationResult {
  const lineGrosses: number[] = new Array(cartItems.length);
  let subtotalPaise = 0;

  for (let i = 0; i < cartItems.length; i++) {
    const qty = normalizeQuantity(cartItems[i].quantity);
    const unitPrice = Math.max(0, Math.round(Number(cartItems[i].unitPricePaise) || 0));
    const gross = Math.round(qty * unitPrice);
    lineGrosses[i] = gross;
    subtotalPaise += gross;
  }

  const safeDiscountVal = Number.isFinite(discountValue) ? discountValue : 0;
  let overallDiscountPaise = 0;
  if (discountType === 'percentage' && safeDiscountVal > 0) {
    const pct = Math.min(100, Math.max(0, safeDiscountVal));
    overallDiscountPaise = Math.min(subtotalPaise, Math.round((subtotalPaise * pct) / 100));
  } else if (discountType === 'fixed' && safeDiscountVal > 0) {
    overallDiscountPaise = Math.min(subtotalPaise, Math.max(0, rupeesToPaise(safeDiscountVal)));
  }

  const lineDiscounts = allocateDiscountsAcrossLines(
    lineGrosses,
    subtotalPaise,
    overallDiscountPaise
  );

  const calculatedItems: CalculatedItem[] = [];
  let taxableSubtotalPaise = 0;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  let totalTaxPaise = 0;
  let unroundedGrandTotalPaise = 0;

  for (let i = 0; i < cartItems.length; i++) {
    const calc = calculateItemTotals(
      cartItems[i],
      lineDiscounts[i],
      isInterState,
      lineGrosses[i]
    );
    calculatedItems.push(calc);
    taxableSubtotalPaise += calc.taxableAmountPaise;
    cgstPaise += calc.cgstPaise;
    sgstPaise += calc.sgstPaise;
    igstPaise += calc.igstPaise;
    totalTaxPaise += calc.totalTaxPaise;
    unroundedGrandTotalPaise += calc.totalPaise;
  }

  // Round off paise to nearest full rupee (standard practice in Indian retail)
  const roundedRupees = Math.round(unroundedGrandTotalPaise / 100);
  const grandTotalPaise = roundedRupees * 100;
  const roundOffPaise = grandTotalPaise - unroundedGrandTotalPaise;

  return {
    items: calculatedItems,
    subtotalPaise,
    discountType,
    discountValue,
    discountPaise: overallDiscountPaise,
    taxableSubtotalPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    roundOffPaise,
    grandTotalPaise,
  };
}
