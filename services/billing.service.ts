import { supabase, isSupabaseConfigured } from './supabase';
import {
  Invoice,
  InvoiceItem,
  PaymentRecord,
  Customer,
  BillCalculationResult,
  PaymentMethod,
} from '../types';
import {
  getCurrentFinancialYear,
  formatInvoiceNumber,
} from '../utils/billingCalculator';
import { useBusinessStore } from '../store/business.store';
import { can } from '../utils/permissions';
import { checkAndLogoutIfSuspended } from './sessionGuard';

const CONFIG_ERROR = 'Supabase is not configured. Please check your environment variables.';

const generateClientToken = () =>
  `loc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export const billingService = {
  /**
   * Computes next sequential invoice number for a business & financial year from Supabase
   */
  async getNextInvoiceNumber(
    businessId: string,
    invoicePrefix: string,
    financialYear: string
  ): Promise<string> {
    const { data, count } = await supabase
      .from('invoices')
      .select('invoice_number', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('financial_year', financialYear)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextSeq = (count || 0) + 1;
    const latestNumber = data?.[0]?.invoice_number;
    if (typeof latestNumber === 'string') {
      const parts = latestNumber.split('-');
      const parsed = Number(parts[parts.length - 1]);
      if (!Number.isNaN(parsed) && parsed >= nextSeq) {
        nextSeq = parsed + 1;
      }
    }

    return formatInvoiceNumber(invoicePrefix, financialYear, nextSeq);
  },

  /**
   * Finalizes an invoice atomically in Supabase via create_invoice_atomic RPC
   */
  async createInvoice(
    businessId: string,
    calculation: BillCalculationResult,
    paymentMethod: PaymentMethod,
    paidAmountPaise: number,
    customer?: Customer | null,
    notes?: string,
    invoicePrefix: string = 'QB',
    splitBreakdown?: { cashPaise: number; upiPaise: number }
  ): Promise<{ invoice: Invoice | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { invoice: null, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'create_bill')) {
      return { invoice: null, error: 'Not permitted' };
    }
    if (!can(role, 'apply_discount') && calculation.discountPaise > 0) {
      return { invoice: null, error: 'Not permitted: staff cannot apply discounts.' };
    }

    try {
      const fy = getCurrentFinancialYear();
      const invoiceNumber = await this.getNextInvoiceNumber(businessId, invoicePrefix, fy);
      const localId = generateClientToken();

      const balanceAmountPaise = Math.max(0, calculation.grandTotalPaise - paidAmountPaise);
      const paymentStatus =
        balanceAmountPaise === 0
          ? 'paid'
          : paidAmountPaise > 0
            ? 'partial'
            : 'unpaid';

      const items: InvoiceItem[] = calculation.items.map((it) => ({
        productId: it.cartItem.productId,
        productName: it.cartItem.name,
        unit: it.cartItem.unit,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        subtotalPaise: it.subtotalPaise,
        taxRate: it.cartItem.taxRate,
        cgstPaise: it.cgstPaise,
        sgstPaise: it.sgstPaise,
        igstPaise: it.igstPaise,
        taxPaise: it.totalTaxPaise,
        discountPaise: it.discountPaise,
        totalPaise: it.totalPaise,
      }));

      // Database payments.payment_method permits: 'cash' | 'upi' | 'card' | 'credit'
      const payments: PaymentRecord[] =
        paymentMethod === 'split' && splitBreakdown
          ? [
              ...(splitBreakdown.cashPaise > 0
                ? [
                    {
                      businessId,
                      customerId: customer?.id,
                      amountPaise: splitBreakdown.cashPaise,
                      paymentMethod: 'cash' as const,
                      status: 'completed' as const,
                      localId: `${localId}-cash`,
                      notes: notes || undefined,
                    },
                  ]
                : []),
              ...(splitBreakdown.upiPaise > 0
                ? [
                    {
                      businessId,
                      customerId: customer?.id,
                      amountPaise: splitBreakdown.upiPaise,
                      paymentMethod: 'upi' as const,
                      status: 'completed' as const,
                      localId: `${localId}-upi`,
                      notes: notes || undefined,
                    },
                  ]
                : []),
            ]
          : [
              {
                businessId,
                customerId: customer?.id,
                amountPaise: paidAmountPaise,
                paymentMethod: paymentMethod === 'split' ? 'cash' : paymentMethod,
                status: paidAmountPaise > 0 ? 'completed' : 'pending',
                localId: `${localId}-pay`,
                notes: notes || undefined,
              },
            ];

      const rpcItems = items.map((it) => ({
        product_id: it.productId || null,
        product_name: it.productName,
        unit: it.unit,
        quantity: it.quantity,
        unit_price_paise: it.unitPricePaise,
        subtotal_paise: it.subtotalPaise,
        tax_rate: it.taxRate,
        cgst_paise: it.cgstPaise,
        sgst_paise: it.sgstPaise,
        igst_paise: it.igstPaise,
        tax_paise: it.taxPaise,
        discount_paise: it.discountPaise,
        total_paise: it.totalPaise,
      }));

      const rpcPayments = payments.map((p) => ({
        amount_paise: p.amountPaise,
        payment_method: p.paymentMethod,
        payment_reference: p.paymentReference || null,
        status: p.status,
        local_id: p.localId || null,
        notes: p.notes || null,
      }));

      const { data: invoiceId, error } = await supabase.rpc('create_invoice_atomic', {
        p_business_id: businessId,
        p_customer_id: customer?.id || null,
        p_invoice_number: invoiceNumber,
        p_financial_year: fy,
        p_local_id: localId,
        p_customer_name: customer?.name || 'Walk-in Customer',
        p_customer_phone: customer?.phone || null,
        p_subtotal_paise: calculation.subtotalPaise,
        p_discount_type: calculation.discountType,
        p_discount_value: calculation.discountValue,
        p_discount_paise: calculation.discountPaise,
        p_cgst_paise: calculation.cgstPaise,
        p_sgst_paise: calculation.sgstPaise,
        p_igst_paise: calculation.igstPaise,
        p_total_tax_paise: calculation.totalTaxPaise,
        p_grand_total_paise: calculation.grandTotalPaise,
        p_paid_amount_paise: paidAmountPaise,
        p_balance_amount_paise: balanceAmountPaise,
        p_payment_status: paymentStatus,
        p_payment_method: paymentMethod,
        p_notes: notes || null,
        p_items: rpcItems,
        p_payments: rpcPayments,
      });

      if (error || !invoiceId) {
        await checkAndLogoutIfSuspended(error?.message);
        return { invoice: null, error: error?.message || 'Failed to create invoice' };
      }

      const createdAt = new Date().toISOString();
      const invoice: Invoice = {
        id: String(invoiceId),
        businessId,
        customerId: customer?.id,
        invoiceNumber,
        financialYear: fy,
        localId,
        customerName: customer?.name || 'Walk-in Customer',
        customerPhone: customer?.phone,
        subtotalPaise: calculation.subtotalPaise,
        discountType: calculation.discountType,
        discountValue: calculation.discountValue,
        discountPaise: calculation.discountPaise,
        cgstPaise: calculation.cgstPaise,
        sgstPaise: calculation.sgstPaise,
        igstPaise: calculation.igstPaise,
        totalTaxPaise: calculation.totalTaxPaise,
        grandTotalPaise: calculation.grandTotalPaise,
        paidAmountPaise,
        balanceAmountPaise,
        paymentStatus,
        paymentMethod,
        notes,
        isVoid: false,
        createdAt,
        items,
        payments,
      };

      return { invoice };
    } catch (err: any) {
      return { invoice: null, error: err.message || 'Failed to create invoice' };
    }
  },

  /**
   * Fetch invoice history from Supabase
   */
  async getInvoices(businessId: string): Promise<Invoice[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('Error fetching invoices:', error?.message);
        await checkAndLogoutIfSuspended(error?.message);
        return [];
      }

      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        customerId: d.customer_id || undefined,
        createdBy: d.created_by || undefined,
        invoiceNumber: d.invoice_number,
        financialYear: d.financial_year,
        localId: d.local_id || undefined,
        customerName: d.customer_name || undefined,
        customerPhone: d.customer_phone || undefined,
        subtotalPaise: Number(d.subtotal_paise),
        discountType: d.discount_type,
        discountValue: Number(d.discount_value),
        discountPaise: Number(d.discount_paise),
        cgstPaise: Number(d.cgst_paise),
        sgstPaise: Number(d.sgst_paise),
        igstPaise: Number(d.igst_paise),
        totalTaxPaise: Number(d.total_tax_paise),
        grandTotalPaise: Number(d.grand_total_paise),
        paidAmountPaise: Number(d.paid_amount_paise),
        balanceAmountPaise: Number(d.balance_amount_paise),
        paymentStatus: d.payment_status,
        paymentMethod: d.payment_method,
        notes: d.notes || undefined,
        isVoid: Boolean(d.is_void),
        voidReason: d.void_reason || undefined,
        voidedAt: d.voided_at || undefined,
        createdAt: d.created_at,
        items: d.invoice_items?.map((it: any) => ({
          id: it.id,
          productId: it.product_id || undefined,
          productName: it.product_name,
          unit: it.unit,
          quantity: Number(it.quantity),
          unitPricePaise: Number(it.unit_price_paise),
          subtotalPaise: Number(it.subtotal_paise),
          taxRate: Number(it.tax_rate),
          cgstPaise: Number(it.cgst_paise),
          sgstPaise: Number(it.sgst_paise),
          igstPaise: Number(it.igst_paise),
          taxPaise: Number(it.tax_paise),
          discountPaise: Number(it.discount_paise),
          totalPaise: Number(it.total_paise),
        })),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Cancel / void an invoice in Supabase
   */
  async voidInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'void_invoice')) {
      return { success: false, error: 'Not permitted' };
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          is_void: true,
          void_reason: reason,
          voided_at: new Date().toISOString(),
          payment_status: 'void',
        })
        .eq('id', invoiceId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to void invoice' };
    }
  },

  /**
   * Fetch customers from Supabase
   */
  async getCustomers(businessId: string): Promise<Customer[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error || !data) return [];

      return data.map((c) => ({
        id: c.id,
        businessId: c.business_id,
        name: c.name,
        phone: c.phone || undefined,
        email: c.email || undefined,
        address: c.address || undefined,
        gstin: c.gstin || undefined,
        outstandingBalancePaise: Number(c.outstanding_balance_paise),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Add a new customer in Supabase
   */
  async addCustomer(
    businessId: string,
    customer: Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'outstandingBalancePaise'>
  ): Promise<{ customer: Customer | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { customer: null, error: CONFIG_ERROR };
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || null,
          gstin: customer.gstin || null,
          outstanding_balance_paise: 0,
        })
        .select()
        .single();

      if (error || !data) {
        return { customer: null, error: error?.message || 'Failed to add customer' };
      }

      return {
        customer: {
          id: data.id,
          businessId: data.business_id,
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          gstin: data.gstin || undefined,
          outstandingBalancePaise: Number(data.outstanding_balance_paise),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      };
    } catch (e: any) {
      return { customer: null, error: e.message || 'Failed to add customer' };
    }
  },

  /**
   * Settle outstanding udhar balance for a customer in Supabase
   */
  async settleCustomerUdhar(
    businessId: string,
    customerId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, 'settle_udhar')) {
      return { success: false, error: 'Not permitted' };
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          outstanding_balance_paise: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .eq('business_id', businessId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to settle udhar' };
    }
  },
};
