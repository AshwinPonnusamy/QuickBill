import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Invoice, 
  InvoiceItem, 
  PaymentRecord, 
  Customer, 
  BillCalculationResult, 
  PaymentMethod 
} from '../types';
import { 
  saveInvoiceLocally, 
  getLocalInvoices, 
  getNextInvoiceSequence, 
  markSyncProcessed, 
  getDB 
} from '../database/sqlite';
import { 
  getCurrentFinancialYear, 
  formatInvoiceNumber 
} from '../utils/billingCalculator';

export const billingService = {
  /**
   * Finalizes an invoice, saves locally in SQLite first, and synchronously or asynchronously commits to Supabase.
   */
  async createInvoice(
    businessId: string,
    calculation: BillCalculationResult,
    paymentMethod: PaymentMethod,
    paidAmountPaise: number,
    customer?: Customer | null,
    notes?: string,
    invoicePrefix: string = 'QB'
  ): Promise<{ invoice: Invoice; error?: string }> {
    const fy = getCurrentFinancialYear();
    const nextSeq = getNextInvoiceSequence(fy);
    const invoiceNumber = formatInvoiceNumber(invoicePrefix, fy, nextSeq);
    const invoiceId = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const localId = `loc-${invoiceId}`;

    const balanceAmountPaise = Math.max(0, calculation.grandTotalPaise - paidAmountPaise);
    const paymentStatus = balanceAmountPaise === 0 
      ? 'paid' 
      : paidAmountPaise > 0 
        ? 'partial' 
        : 'unpaid';

    const invoice: Invoice = {
      id: invoiceId,
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
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    const items: InvoiceItem[] = calculation.items.map((it, idx) => ({
      id: `item-${invoiceId}-${idx}`,
      invoiceId,
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

    const payments: PaymentRecord[] = [
      {
        id: `pay-${invoiceId}`,
        businessId,
        invoiceId,
        customerId: customer?.id,
        amountPaise: paidAmountPaise,
        paymentMethod,
        status: paidAmountPaise > 0 ? 'completed' : 'pending',
        localId: `loc-pay-${invoiceId}`,
        notes: notes || undefined,
        createdAt: invoice.createdAt,
      },
    ];

    // 1. Mandatory Offline-First Storage: Save locally first
    saveInvoiceLocally(invoice, items, payments);

    // 2. If Supabase is connected, attempt immediate atomic sync
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('create_invoice_atomic', {
          p_business_id: businessId,
          p_customer_id: customer?.id || null,
          p_invoice_number: invoiceNumber,
          p_financial_year: fy,
          p_local_id: localId,
          p_customer_name: invoice.customerName,
          p_customer_phone: invoice.customerPhone || null,
          p_subtotal_paise: invoice.subtotalPaise,
          p_discount_type: invoice.discountType,
          p_discount_value: invoice.discountValue,
          p_discount_paise: invoice.discountPaise,
          p_cgst_paise: invoice.cgstPaise,
          p_sgst_paise: invoice.sgstPaise,
          p_igst_paise: invoice.igstPaise,
          p_total_tax_paise: invoice.totalTaxPaise,
          p_grand_total_paise: invoice.grandTotalPaise,
          p_paid_amount_paise: invoice.paidAmountPaise,
          p_balance_amount_paise: invoice.balanceAmountPaise,
          p_payment_status: invoice.paymentStatus,
          p_payment_method: invoice.paymentMethod,
          p_notes: invoice.notes || null,
          p_items: items,
          p_payments: payments,
        });

        if (!error && data) {
          invoice.syncStatus = 'synced';
          markSyncProcessed(`sync-${invoice.id}`, invoice.id);
        }
      } catch (err) {
        // Kept as pending sync in local SQLite
      }
    }

    return {
      invoice: {
        ...invoice,
        items,
        payments,
      },
    };
  },

  /**
   * Fetch invoice history with filtering
   */
  async getInvoices(businessId: string): Promise<Invoice[]> {
    const local = getLocalInvoices(businessId);

    if (!isSupabaseConfigured()) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error || !data) return local;

      return data.map((d: any) => ({
        id: d.id,
        businessId: d.business_id,
        customerId: d.customer_id,
        createdBy: d.created_by,
        invoiceNumber: d.invoice_number,
        financialYear: d.financial_year,
        localId: d.local_id,
        customerName: d.customer_name,
        customerPhone: d.customer_phone,
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
        notes: d.notes,
        isVoid: d.is_void,
        voidReason: d.void_reason,
        voidedAt: d.voided_at,
        syncStatus: d.sync_status || 'synced',
        createdAt: d.created_at,
        items: d.invoice_items?.map((it: any) => ({
          id: it.id,
          productId: it.product_id,
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
    } catch (e) {
      return local;
    }
  },

  /**
   * Cancel / void an invoice
   */
  async voidInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const db = getDB();
    if (db && typeof db.runSync === 'function') {
      try {
        db.runSync(
          `UPDATE local_invoices SET is_void = 1, void_reason = ?, payment_status = 'void' WHERE id = ?;`,
          [reason, invoiceId]
        );
      } catch (e) {}
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
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
      return { success: false, error: e.message };
    }
  },

  /**
   * Customer operations
   */
  async getCustomers(businessId: string): Promise<Customer[]> {
    if (!isSupabaseConfigured()) {
      const defaultCustomers: Customer[] = [
        {
          id: 'cust-1',
          businessId,
          name: 'Karthik Raja',
          phone: '9840123456',
          address: '12 Main Bazaar St, Salem',
          outstandingBalancePaise: 45000, // ₹450.00 udhar
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'cust-2',
          businessId,
          name: 'Meena Sundaram',
          phone: '9443654321',
          address: '45 Cross St, Madurai',
          outstandingBalancePaise: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      return defaultCustomers;
    }

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
        phone: c.phone,
        email: c.email,
        address: c.address,
        gstin: c.gstin,
        outstandingBalancePaise: Number(c.outstanding_balance_paise),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch (e) {
      return [];
    }
  },

  async addCustomer(
    businessId: string,
    customer: Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'outstandingBalancePaise'>
  ): Promise<Customer> {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      businessId,
      ...customer,
      outstandingBalancePaise: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      return newCust;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          gstin: customer.gstin,
          outstanding_balance_paise: 0,
        })
        .select()
        .single();

      if (error || !data) return newCust;
      return {
        id: data.id,
        businessId: data.business_id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gstin: data.gstin,
        outstandingBalancePaise: Number(data.outstanding_balance_paise),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (e) {
      return newCust;
    }
  },
};

