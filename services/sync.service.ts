import { supabase, isSupabaseConfigured } from './supabase';
import { 
  getPendingSyncQueue, 
  markSyncProcessed, 
  markSyncFailed 
} from '../database/sqlite';

export const syncService = {
  isSyncing: false,

  /**
   * Process all pending items in the local SQLite sync queue
   */
  async processSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isSyncing || !isSupabaseConfigured()) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;

    try {
      const items = getPendingSyncQueue();

      for (const item of items) {
        try {
          if (item.entityType === 'invoice') {
            const { invoice, items: invItems, payments } = JSON.parse(item.payload);
            
            const { data, error } = await supabase.rpc('create_invoice_atomic', {
              p_business_id: invoice.businessId,
              p_customer_id: invoice.customerId || null,
              p_invoice_number: invoice.invoiceNumber,
              p_financial_year: invoice.financialYear,
              p_local_id: invoice.localId,
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
              p_items: invItems,
              p_payments: payments,
            });

            if (error) {
              markSyncFailed(item.id, error.message, invoice.id);
              failed++;
            } else {
              markSyncProcessed(item.id, invoice.id);
              processed++;
            }
          } else if (item.entityType === 'product') {
            const product = JSON.parse(item.payload);
            const { error } = await supabase.from('products').upsert({
              id: product.id,
              business_id: product.businessId,
              category_id: product.categoryId || null,
              name: product.name,
              name_tamil: product.nameTamil || null,
              sku: product.sku || null,
              barcode: product.barcode || null,
              selling_price_paise: product.sellingPricePaise,
              purchase_price_paise: product.purchasePricePaise || null,
              unit: product.unit,
              tax_rate: product.taxRate,
              is_tax_inclusive: product.isTaxInclusive,
              stock_quantity: product.stockQuantity,
              low_stock_threshold: product.lowStockThreshold,
              image_url: product.imageUrl || null,
              is_favourite: product.isFavourite,
              is_active: product.isActive,
            });

            if (error) {
              markSyncFailed(item.id, error.message);
              failed++;
            } else {
              markSyncProcessed(item.id);
              processed++;
            }
          }
        } catch (err: any) {
          markSyncFailed(item.id, err.message || 'Unknown error');
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, failed };
  },
};

