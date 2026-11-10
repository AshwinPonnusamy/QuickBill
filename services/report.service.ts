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
  chartData: { value: number; label: string; frontColor?: string }[];
  topProducts: { name: string; quantity: number; revenuePaise: number }[];
}

export const reportService = {
  /**
   * Generates sales report metrics for given period
   */
  generateReport(
    invoices: Invoice[],
    period: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly'
  ): SalesReportMetrics {
    const validInvoices = invoices.filter((i) => !i.isVoid);

    let totalRevenuePaise = 0;
    let cashPaymentsPaise = 0;
    let upiPaymentsPaise = 0;
    let cardPaymentsPaise = 0;
    let pendingUdharPaise = 0;

    const productMap = new Map<string, { quantity: number; revenuePaise: number }>();
    const dayMap = new Map<string, number>();

    // Initialize last 7 days for weekly chart
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      dayMap.set(dayLabel, 0);
    }

    validInvoices.forEach((inv) => {
      totalRevenuePaise += inv.grandTotalPaise;
      pendingUdharPaise += inv.balanceAmountPaise;

      if (inv.paymentMethod === 'cash') cashPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'upi') upiPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'card') cardPaymentsPaise += inv.paidAmountPaise;
      else if (inv.paymentMethod === 'split') {
        cashPaymentsPaise += Math.round(inv.paidAmountPaise / 2);
        upiPaymentsPaise += inv.paidAmountPaise - Math.round(inv.paidAmountPaise / 2);
      }

      // Group by day for chart
      const invDate = new Date(inv.createdAt);
      const dayLabel = invDate.toLocaleDateString('en-US', { weekday: 'short' });
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
      .slice(0, 5);

    return {
      totalRevenuePaise,
      totalBills,
      averageBillValuePaise,
      cashPaymentsPaise,
      upiPaymentsPaise,
      cardPaymentsPaise,
      pendingUdharPaise,
      chartData,
      topProducts,
    };
  },
};

