import { Invoice } from "../types";
import { paiseToRupees } from "../utils/billingCalculator";
import { useBusinessStore } from "../store/business.store";
import { can } from "../utils/permissions";
import { supabase, isSupabaseConfigured } from "./supabase";
import { billingService } from "./billing.service";

export interface DailySalesRow {
  business_id: string;
  day: string;
  bills: number;
  revenue_paise: number;
  tax_paise: number;
  cgst_paise?: number;
  sgst_paise?: number;
  igst_paise?: number;
  discount_paise: number;
  pending_udhar_paise?: number;
  cash_paise: number;
  upi_paise: number;
  card_paise: number;
}

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
   * Role-checked entry point for sales report metrics
   */
  getAuthorizedReport(
    invoices: Invoice[],
    period: "daily" | "weekly" | "monthly" | "all" = "weekly",
  ): { metrics: SalesReportMetrics | null; error?: string } {
    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "view_reports")) {
      return { metrics: null, error: "Not permitted" };
    }
    return { metrics: this.generateReport(invoices, period) };
  },

  /**
   * Queries pre-aggregated `reports_daily_sales` SQL view for multi-day periods so large
   * businesses do not download hundreds of full invoices, falling back to `getInvoices`
   * when `daily` slot breakdown or fallback is needed.
   */
  async fetchReportForPeriod(
    businessId: string,
    period: "daily" | "weekly" | "monthly" | "all" = "weekly",
  ): Promise<{
    metrics: SalesReportMetrics | null;
    invoices: Invoice[];
    error?: string;
  }> {
    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "view_reports")) {
      return { metrics: null, invoices: [], error: "Not permitted" };
    }

    if (period !== "daily" && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from("reports_daily_sales")
          .select("*")
          .eq("business_id", businessId)
          .order("day", { ascending: true });

        if (period === "weekly" || period === "monthly") {
          const daysBack = period === "weekly" ? 7 : 30;
          const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
          const dayIso = cutoff.toISOString().slice(0, 10);
          query = query.gte("day", dayIso);
        }

        const { data: rows, error } = await query;
        if (!error && Array.isArray(rows)) {
          const typedRows = rows as DailySalesRow[];
          let totalRevenuePaise = 0;
          let totalBills = 0;
          let cashPaymentsPaise = 0;
          let upiPaymentsPaise = 0;
          let cardPaymentsPaise = 0;
          let pendingUdharPaise = 0;
          let totalGstPaise = 0;
          let cgstPaise = 0;
          let sgstPaise = 0;
          let igstPaise = 0;
          let totalDiscountGivenPaise = 0;

          const daySeries = new Map<string, number>();
          typedRows.forEach((r) => {
            totalRevenuePaise += Number(r.revenue_paise || 0);
            totalBills += Number(r.bills || 0);
            cashPaymentsPaise += Number(r.cash_paise || 0);
            upiPaymentsPaise += Number(r.upi_paise || 0);
            cardPaymentsPaise += Number(r.card_paise || 0);
            pendingUdharPaise += Number(r.pending_udhar_paise || 0);
            totalGstPaise += Number(r.tax_paise || 0);
            cgstPaise += Number(r.cgst_paise || 0);
            sgstPaise += Number(r.sgst_paise || 0);
            igstPaise += Number(r.igst_paise || 0);
            totalDiscountGivenPaise += Number(r.discount_paise || 0);

            const d = new Date(`${r.day}T00:00:00`);
            const label =
              period === "monthly" || period === "all"
                ? d.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })
                : d.toLocaleDateString("en-US", { weekday: "short" });
            daySeries.set(
              label,
              Math.round(paiseToRupees(Number(r.revenue_paise || 0))),
            );
          });

          const chartData = Array.from(daySeries.entries()).map(
            ([label, value]) => ({
              label,
              value,
              frontColor: "#087E8B",
            }),
          );

          return {
            metrics: {
              totalRevenuePaise,
              totalBills,
              averageBillValuePaise:
                totalBills > 0 ? Math.round(totalRevenuePaise / totalBills) : 0,
              cashPaymentsPaise,
              upiPaymentsPaise,
              cardPaymentsPaise,
              pendingUdharPaise,
              totalGstPaise,
              cgstPaise,
              sgstPaise,
              igstPaise,
              customerBillCount: 0,
              walkInBillCount: 0,
              totalDiscountGivenPaise,
              chartData,
              topProducts: [],
            },
            invoices: [],
          };
        }
      } catch {
        // Fall back to client-side invoice aggregation when view is unavailable
      }
    }

    const invoices = await billingService.getInvoices(businessId, {
      limit: 500,
      withItems: true,
      withPayments: true,
    });
    return {
      metrics: this.generateReport(invoices, period),
      invoices,
    };
  },

  /**
   * Generates sales report metrics for given period
   */
  generateReport(
    invoices: Invoice[],
    period: "daily" | "weekly" | "monthly" | "all" = "weekly",
  ): SalesReportMetrics {
    const now = new Date();
    const validInvoices = invoices.filter((i) => {
      if (i.isVoid) return false;
      const invDate = new Date(i.createdAt);
      if (period === "daily") {
        return (
          invDate.getDate() === now.getDate() &&
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      }
      if (period === "weekly") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return invDate >= weekAgo;
      }
      if (period === "monthly") {
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

    const productMap = new Map<
      string,
      { quantity: number; revenuePaise: number }
    >();
    const dayMap = new Map<string, number>();

    const dayLabelCache = new Map<string, string>();
    const formatCachedDayLabel = (
      invDate: Date,
      isMonthly: boolean,
    ): string => {
      const key = `${invDate.getFullYear()}-${invDate.getMonth()}-${invDate.getDate()}-${isMonthly ? "m" : "w"}`;
      const existing = dayLabelCache.get(key);
      if (existing) return existing;
      const formatted = isMonthly
        ? invDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          })
        : invDate.toLocaleDateString("en-US", { weekday: "short" });
      dayLabelCache.set(key, formatted);
      return formatted;
    };

    // Initialize days for chart according to period
    if (period === "daily") {
      const slots = [
        "Morning (6-11)",
        "Noon (11-15)",
        "Eve (15-19)",
        "Night (19-23)",
      ];
      slots.forEach((s) => dayMap.set(s, 0));
    } else {
      const daysCount = period === "weekly" ? 7 : period === "monthly" ? 14 : 7;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        dayMap.set(formatCachedDayLabel(d, period === "monthly"), 0);
      }
    }

    validInvoices.forEach((inv) => {
      totalRevenuePaise += inv.grandTotalPaise;
      pendingUdharPaise += inv.balanceAmountPaise;

      // Tax metrics
      totalGstPaise +=
        inv.totalTaxPaise || inv.cgstPaise + inv.sgstPaise + inv.igstPaise || 0;
      cgstPaise += inv.cgstPaise || 0;
      sgstPaise += inv.sgstPaise || 0;
      igstPaise += inv.igstPaise || 0;

      // Discount & Customer categorization (handle '' / 'Walk-in' / 'Walk-in Customer' case-insensitively)
      totalDiscountGivenPaise += inv.discountPaise || 0;
      const normalizedName = (inv.customerName || "").trim().toLowerCase();
      const isWalkIn =
        !inv.customerId &&
        (normalizedName === "" ||
          normalizedName === "walk-in" ||
          normalizedName === "walk-in customer");
      if (isWalkIn) {
        walkInBillCount++;
      } else {
        customerBillCount++;
      }

      // Prefer real payment records from `payments` table; use 50/50 split only as fallback
      const completedPayments = (inv.payments || []).filter(
        (p) => !p.status || p.status === "completed",
      );
      if (completedPayments.length > 0) {
        completedPayments.forEach((p) => {
          if (p.paymentMethod === "cash") cashPaymentsPaise += p.amountPaise;
          else if (p.paymentMethod === "upi") upiPaymentsPaise += p.amountPaise;
          else if (p.paymentMethod === "card")
            cardPaymentsPaise += p.amountPaise;
        });
      } else if (inv.paymentMethod === "cash") {
        cashPaymentsPaise += inv.paidAmountPaise;
      } else if (inv.paymentMethod === "upi") {
        upiPaymentsPaise += inv.paidAmountPaise;
      } else if (inv.paymentMethod === "card") {
        cardPaymentsPaise += inv.paidAmountPaise;
      } else if (inv.paymentMethod === "split") {
        const cashShare = Math.round(inv.paidAmountPaise / 2);
        cashPaymentsPaise += cashShare;
        upiPaymentsPaise += inv.paidAmountPaise - cashShare;
      }

      // Group for chart using cached day label lookup
      const invDate = new Date(inv.createdAt);
      let dayLabel = "";
      if (period === "daily") {
        const h = invDate.getHours();
        if (h >= 6 && h < 11) dayLabel = "Morning (6-11)";
        else if (h >= 11 && h < 15) dayLabel = "Noon (11-15)";
        else if (h >= 15 && h < 19) dayLabel = "Eve (15-19)";
        else dayLabel = "Night (19-23)";
      } else {
        dayLabel = formatCachedDayLabel(invDate, period === "monthly");
      }

      if (dayMap.has(dayLabel)) {
        dayMap.set(
          dayLabel,
          (dayMap.get(dayLabel) || 0) + paiseToRupees(inv.grandTotalPaise),
        );
      }

      // Item level grouping
      (inv.items || []).forEach((it) => {
        const existing = productMap.get(it.productName) || {
          quantity: 0,
          revenuePaise: 0,
        };
        productMap.set(it.productName, {
          quantity: existing.quantity + it.quantity,
          revenuePaise: existing.revenuePaise + it.totalPaise,
        });
      });
    });

    const totalBills = validInvoices.length;
    const averageBillValuePaise =
      totalBills > 0 ? Math.round(totalRevenuePaise / totalBills) : 0;

    const chartData = Array.from(dayMap.entries()).map(([label, val]) => ({
      label,
      value: Math.round(val),
      frontColor: "#087E8B",
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
