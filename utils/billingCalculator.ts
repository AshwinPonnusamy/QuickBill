import { 
  CartItem, 
  CalculatedItem, 
  BillCalculationResult, 
  DiscountType 
} from '../types';

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
  isInterState: boolean = false
): CalculatedItem {
  const qty = Number(cartItem.quantity) || 1;
  const unitPrice = Math.round(Number(cartItem.unitPricePaise) || 0);
  const grossSubtotalPaise = Math.round(qty * unitPrice);

  const discountPaise = Math.min(grossSubtotalPaise, Math.max(0, itemDiscountPaise));
  const effectiveSubtotalPaise = grossSubtotalPaise - discountPaise;

  const taxRate = Number(cartItem.taxRate) || 0;
  let taxableAmountPaise = 0;
  let totalTaxPaise = 0;
  let totalPaise = 0;

  if (taxRate <= 0) {
    taxableAmountPaise = effectiveSubtotalPaise;
    totalTaxPaise = 0;
    totalPaise = effectiveSubtotalPaise;
  } else if (cartItem.isTaxInclusive) {
    // Formula: Taxable = Total / (1 + Rate / 100)
    taxableAmountPaise = Math.round(effectiveSubtotalPaise / (1 + taxRate / 100));
    totalTaxPaise = effectiveSubtotalPaise - taxableAmountPaise;
    totalPaise = effectiveSubtotalPaise;
  } else {
    // Formula: Tax = Taxable * (Rate / 100)
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
 * Calculates complete bill total including line items, cart-level discounts,
 * itemized GST taxes, and rupee rounding.
 */
export function calculateBill(
  cartItems: CartItem[],
  discountType: DiscountType = 'none',
  discountValue: number = 0,
  isInterState: boolean = false
): BillCalculationResult {
  let subtotalPaise = 0;
  cartItems.forEach((item) => {
    subtotalPaise += Math.round((Number(item.quantity) || 1) * (Number(item.unitPricePaise) || 0));
  });

  // Calculate bill-level discount in paise
  let overallDiscountPaise = 0;
  if (discountType === 'percentage' && discountValue > 0) {
    const pct = Math.min(100, Math.max(0, Number(discountValue)));
    overallDiscountPaise = Math.round((subtotalPaise * pct) / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    overallDiscountPaise = Math.min(subtotalPaise, rupeesToPaise(Number(discountValue)));
  }

  // Proportionally allocate cart discount across items so line taxes are exact
  const calculatedItems: CalculatedItem[] = [];
  let allocatedDiscount = 0;

  cartItems.forEach((item, index) => {
    const itemGross = Math.round((Number(item.quantity) || 1) * (Number(item.unitPricePaise) || 0));
    let itemDisc = 0;

    if (subtotalPaise > 0 && overallDiscountPaise > 0) {
      if (index === cartItems.length - 1) {
        // Last item absorbs any rounding difference
        itemDisc = overallDiscountPaise - allocatedDiscount;
      } else {
        itemDisc = Math.round((itemGross / subtotalPaise) * overallDiscountPaise);
        allocatedDiscount += itemDisc;
      }
    }

    const calc = calculateItemTotals(item, itemDisc, isInterState);
    calculatedItems.push(calc);
  });

  let taxableSubtotalPaise = 0;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  let totalTaxPaise = 0;
  let unroundedGrandTotalPaise = 0;

  calculatedItems.forEach((item) => {
    taxableSubtotalPaise += item.taxableAmountPaise;
    cgstPaise += item.cgstPaise;
    sgstPaise += item.sgstPaise;
    igstPaise += item.igstPaise;
    totalTaxPaise += item.totalTaxPaise;
    unroundedGrandTotalPaise += item.totalPaise;
  });

  // Round off paise to nearest full rupee (standard practice in Indian retail)
  const exactRupees = unroundedGrandTotalPaise / 100;
  const roundedRupees = Math.round(exactRupees);
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
