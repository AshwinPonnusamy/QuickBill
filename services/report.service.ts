import { Invoice, Product } from '../types';
import { paiseToRupees } from '../utils/billingCalculator';

export interface SalesReportMetrics {
  totalRevenuePaise: number;
  totalBills: number;
  averageBillValuePaise: number;
  cashPaymentsPaise: number;
  upiPaymentsPaise: number;
  cardPaymentsPaise: number;
  pendingUdharPaise: number;
  // GST Tax breakdown
  totalGstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  // Customer & Bill insights
  customerBillCount: number;
  walkInBillCount: number;
  totalDiscountGivenPaise: number;
  chartData: { value: number; label: string; frontColor?: string }[];
  topProducts: { name: string; quantity: number; revenuePaise: number }[];
  hourlyActivity?: { hour: string; bills: number; revenuePaise: number }[];
}

export const reportService = {
  /**
   * Generates sales report metrics for given period
   */
  generateReport(
    invoices: Invoice[],
    period: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly'
  ): SalesReportMetrics {
    const now = new Date();
    const validInvoices = invoices.filter((i) => {
      if (i.isVoid) return false;
      const invDate = new Date(i.createdAt);
      if (period === 'daily') {
        return (
          invDate.getDate() === now.getDate() &&
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      }
      if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return invDate >= weekAgo;
      }
      if (period === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return invDate >= monthAgo;
      }
      return true; // 'all'
    });

    let totalRevenuePaise = 0;
    let cashPaymentsPaise = 0;
    let upiPaymentsPaise = 0;
    let cardPaymentsPaise = 0;
    let pendingUdharPaise = 0;

    let totalGstPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    let customerBillCount = 0;
    let walkInBillCount = 0;
    let totalDiscountGivenPaise = 0;

    const productMap = new Map<string, { quantity: number; revenuePaise: number }>();
    const dayMap = new Map<string, number>();

    // Initialize days for chart according to period
    if (period === 'daily') {
      // 4-hour slots
      const slots = ['Morning (6-11)', 'Noon (11-15)', 'Eve (15-19)', 'Night (19-23)'];
      slots.forEach((s) => dayMap.set(s, 0));
    } else {
      const daysCount = period === 'weekly' ? 7 : period === 'monthly' ? 14 : 7;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayLabel = period === 'monthly' 
          ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          : d.toLocaleDateString('en-US', { weekday: 'short' });
        dayMap.set(dayLabel, 0);
      }
    }

    validInvoices.forEach((inv) => {
      totalRevenuePaise += inv.grandTotalPaise;
      pendingUdharPaise += inv.balanceAmountPaise;

      // Tax metrics
      totalGstPaise += inv.totalTaxPaise || (inv.cgstPaise + inv.sgstPaise + inv.igstPaise) || 0;
      cgstPaise += inv.cgstPaise || 0;
      sgstPaise += inv.sgstPaise || 0;
      igstPaise += inv.igstPaise || 0;

      // Discount & Customer categorization
      totalDiscountGivenPaise += inv.discountPaise || 0;
      if (inv.customerName && inv.customerName.trim() !== '' && inv.customerName !== 'Walk-in') {
        customerBillCount++;
      } else {
        walkInBillCount++;
      }

      if (inv.paymentMethod === 'cash') cashPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'upi') upiPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'card') cardPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'split') {
        cashPaymentsPaise += Math.round(inv.paidAmountPaise / 2);
        upiPaymentsPaise += inv.paidAmountPaise - Math.round(inv.paidAmountPaise / 2);
      }

      // Group for chart
      const invDate = new Date(inv.createdAt);
      let dayLabel = '';
      if (period === 'daily') {
        const h = invDate.getHours();
        if (h >= 6 && h < 11) dayLabel = 'Morning (6-11)';
        else if (h >= 11 && h < 15) dayLabel = 'Noon (11-15)';
        else if (h >= 15 && h < 19) dayLabel = 'Eve (15-19)';
        else dayLabel = 'Night (19-23)';
      } else if (period === 'monthly') {
        dayLabel = invDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      } else {
        dayLabel = invDate.toLocaleDateString('en-US', { weekday: 'short' });
      }

      if (dayMap.has(dayLabel)) {
        dayMap.set(dayLabel, (dayMap.get(dayLabel) || 0) + paiseToRupees(inv.grandTotalPaise));
      }

      // Item level grouping
      (inv.items || []).forEach((it) => {
        const existing = productMap.get(it.productName) || { quantity: 0, revenuePaise: 0 };
        productMap.set(it.productName, {
          quantity: existing.quantity + it.quantity,
          revenuePaise: existing.revenuePaise + it.totalPaise,
        });
      });
    });

    const totalBills = validInvoices.length;
    const averageBillValuePaise = totalBills > 0 ? Math.round(totalRevenuePaise / totalBills) : 0;

    const chartData = Array.from(dayMap.entries()).map(([label, val]) => ({
      label,
      value: Math.round(val),
      frontColor: '#087E8B',
    }));

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenuePaise: data.revenuePaise,
      }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 10);

    return {
      totalRevenuePaise,
      totalBills,
      averageBillValuePaise,
      cashPaymentsPaise,
      upiPaymentsPaise,
      cardPaymentsPaise,
      pendingUdharPaise,
      totalGstPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      customerBillCount,
      walkInBillCount,
      totalDiscountGivenPaise,
      chartData,
      topProducts,
    };
  },
};

