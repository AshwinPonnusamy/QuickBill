import * as SQLite from 'expo-sqlite';
import { 
  Invoice, 
  InvoiceItem, 
  PaymentRecord, 
  Product, 
  Category, 
  Customer, 
  SyncQueueItem 
} from '../types';

let dbInstance: any = null;

export const getDB = () => {
  if (!dbInstance) {
    if (typeof (SQLite as any).openDatabaseSync === 'function') {
      dbInstance = (SQLite as any).openDatabaseSync('quickbill.db');
    } else if (typeof (SQLite as any).openDatabase === 'function') {
      dbInstance = (SQLite as any).openDatabase('quickbill.db');
    }
  }
  return dbInstance;
};

/**
 * Initializes local SQLite tables for offline-first billing
 */
export async function initDatabase(): Promise<void> {
  const db = getDB();
  if (!db) {
    console.warn('SQLite database is unavailable in this environment.');
    return;
  }

  const queries = [
    // 1. Local Invoices table
    `CREATE TABLE IF NOT EXISTS local_invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT,
      created_by TEXT,
      invoice_number TEXT NOT NULL,
      financial_year TEXT NOT NULL,
      local_id TEXT NOT NULL UNIQUE,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal_paise INTEGER NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'none',
      discount_value REAL NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      cgst_paise INTEGER NOT NULL DEFAULT 0,
      sgst_paise INTEGER NOT NULL DEFAULT 0,
      igst_paise INTEGER NOT NULL DEFAULT 0,
      total_tax_paise INTEGER NOT NULL DEFAULT 0,
      grand_total_paise INTEGER NOT NULL,
      paid_amount_paise INTEGER NOT NULL DEFAULT 0,
      balance_amount_paise INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      is_void INTEGER NOT NULL DEFAULT 0,
      void_reason TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );`,

    // 2. Local Invoice Items table
    `CREATE TABLE IF NOT EXISTS local_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      product_name_tamil TEXT,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      subtotal_paise INTEGER NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      cgst_paise INTEGER NOT NULL DEFAULT 0,
      sgst_paise INTEGER NOT NULL DEFAULT 0,
      igst_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES local_invoices(id) ON DELETE CASCADE
    );`,

    // 3. Local Payments table
    `CREATE TABLE IF NOT EXISTS local_payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      customer_id TEXT,
      amount_paise INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_reference TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      local_id TEXT NOT NULL UNIQUE,
      notes TEXT,
      created_at TEXT NOT NULL
    );`,

    // 4. Local Products cache
    `CREATE TABLE IF NOT EXISTS local_products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      name_tamil TEXT,
      sku TEXT,
      barcode TEXT,
      selling_price_paise INTEGER NOT NULL,
      purchase_price_paise INTEGER,
      unit TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      low_stock_threshold REAL NOT NULL DEFAULT 5,
      image_url TEXT,
      is_favourite INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );`,

    // 5. Local Categories cache
    `CREATE TABLE IF NOT EXISTS local_categories (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_tamil TEXT,
      icon TEXT,
      color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );`,

    // 6. Local Customers cache
    `CREATE TABLE IF NOT EXISTS local_customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      outstanding_balance_paise INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );`,

    // 7. Sync Queue Table
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 8. Offline Sequential Counter
    `CREATE TABLE IF NOT EXISTS invoice_counters (
      financial_year TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0
    );`
  ];

  try {
    if (typeof db.execSync === 'function') {
      for (const query of queries) {
        db.execSync(query);
      }
    } else if (typeof db.transaction === 'function') {
      await new Promise<void>((resolve, reject) => {
        db.transaction((tx: any) => {
          queries.forEach((q) => tx.executeSql(q));
        }, reject, resolve);
      });
    }
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
  }
}

/**
 * Gets next safe local invoice sequence number for a financial year
 */
export function getNextInvoiceSequence(fy: string): number {
  const db = getDB();
  if (!db || typeof db.getFirstSync !== 'function') return 1;

  try {
    const row = db.getFirstSync(
      'SELECT last_number FROM invoice_counters WHERE financial_year = ?;',
      [fy]
    ) as { last_number: number } | null;

    const nextVal = (row?.last_number || 0) + 1;
    db.runSync(
      'INSERT INTO invoice_counters (financial_year, last_number) VALUES (?, ?) ON CONFLICT(financial_year) DO UPDATE SET last_number = ?;',
      [fy, nextVal, nextVal]
    );
    return nextVal;
  } catch (e) {
    console.warn('Error generating sequence:', e);
    return Date.now() % 10000;
  }
}

/**
 * Saves a completed invoice, items, and payment locally before showing success
 */
export function saveInvoiceLocally(
  invoice: Invoice,
  items: InvoiceItem[],
  payments: PaymentRecord[]
): void {
  const db = getDB();
  if (!db) return;

  try {
    if (typeof db.runSync === 'function') {
      // 1. Insert invoice
      db.runSync(
        `INSERT OR REPLACE INTO local_invoices (
          id, business_id, customer_id, created_by, invoice_number, financial_year,
          local_id, customer_name, customer_phone, subtotal_paise, discount_type,
          discount_value, discount_paise, cgst_paise, sgst_paise, igst_paise,
          total_tax_paise, grand_total_paise, paid_amount_paise, balance_amount_paise,
          payment_status, payment_method, notes, is_void, sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          invoice.id,
          invoice.businessId,
          invoice.customerId || null,
          invoice.createdBy || null,
          invoice.invoiceNumber,
          invoice.financialYear,
          invoice.localId || invoice.id,
          invoice.customerName || null,
          invoice.customerPhone || null,
          invoice.subtotalPaise,
          invoice.discountType,
          invoice.discountValue,
          invoice.discountPaise,
          invoice.cgstPaise,
          invoice.sgstPaise,
          invoice.igstPaise,
          invoice.totalTaxPaise,
          invoice.grandTotalPaise,
          invoice.paidAmountPaise,
          invoice.balanceAmountPaise,
          invoice.paymentStatus,
          invoice.paymentMethod,
          invoice.notes || null,
          invoice.isVoid ? 1 : 0,
          invoice.syncStatus,
          invoice.createdAt
        ]
      );

      // 2. Insert items
      for (const item of items) {
        db.runSync(
          `INSERT OR REPLACE INTO local_invoice_items (
            id, invoice_id, product_id, product_name, product_name_tamil, unit,
            quantity, unit_price_paise, subtotal_paise, tax_rate, cgst_paise,
            sgst_paise, igst_paise, tax_paise, discount_paise, total_paise
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id || `${invoice.id}-${item.productId || Math.random()}`,
            invoice.id,
            item.productId || null,
            item.productName,
            item.productNameTamil || null,
            item.unit,
            item.quantity,
            item.unitPricePaise,
            item.subtotalPaise,
            item.taxRate,
            item.cgstPaise,
            item.sgstPaise,
            item.igstPaise,
            item.taxPaise,
            item.discountPaise,
            item.totalPaise
          ]
        );

        // Update local stock quantity
        if (item.productId) {
          db.runSync(
            `UPDATE local_products SET stock_quantity = stock_quantity - ? WHERE id = ?;`,
            [item.quantity, item.productId]
          );
        }
      }

      // 3. Insert payments
      for (const payment of payments) {
        db.runSync(
          `INSERT OR REPLACE INTO local_payments (
            id, business_id, invoice_id, customer_id, amount_paise, payment_method,
            payment_reference, status, local_id, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            payment.id || `${invoice.id}-p1`,
            payment.businessId,
            invoice.id,
            payment.customerId || null,
            payment.amountPaise,
            payment.paymentMethod,
            payment.paymentReference || null,
            payment.status,
            payment.localId || `${invoice.id}-local-pay`,
            payment.notes || null,
            payment.createdAt || invoice.createdAt
          ]
        );
      }

      // 4. Enqueue to sync queue
      enqueueSyncItem({
        id: `sync-${invoice.id}`,
        businessId: invoice.businessId,
        entityType: 'invoice',
        entityId: invoice.id,
        operation: 'insert',
        payload: JSON.stringify({ invoice, items, payments }),
        retryCount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to save invoice locally:', error);
  }
}

/**
 * Enqueue item for background sync
 */
export function enqueueSyncItem(item: SyncQueueItem): void {
  const db = getDB();
  if (!db || typeof db.runSync !== 'function') return;

  try {
    db.runSync(
      `INSERT OR REPLACE INTO sync_queue (
        id, business_id, entity_type, entity_id, operation, payload,
        retry_count, status, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.businessId,
        item.entityType,
        item.entityId,
        item.operation,
        item.payload,
        item.retryCount,
        item.status,
        item.errorMessage || null,
        item.createdAt,
        item.updatedAt
      ]
    );
  } catch (e) {
    console.error('Error enqueueing sync item:', e);
  }
}

/**
 * Fetch pending sync queue items
 */
export function getPendingSyncQueue(): SyncQueueItem[] {
  const db = getDB();
  if (!db || typeof db.getAllSync !== 'function') return [];

  try {
    return db.getAllSync(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50;`
    ) as SyncQueueItem[];
  } catch (e) {
    return [];
  }
}

/**
 * Mark sync item as processed
 */
export function markSyncProcessed(id: string, invoiceId?: string): void {
  const db = getDB();
  if (!db || typeof db.runSync !== 'function') return;

  try {
    db.runSync(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
    if (invoiceId) {
      db.runSync(`UPDATE local_invoices SET sync_status = 'synced' WHERE id = ?;`, [invoiceId]);
    }
  } catch (e) {
    console.error('Error marking sync item processed:', e);
  }
}

/**
 * Mark sync item as failed with retry increment
 */
export function markSyncFailed(id: string, error: string, invoiceId?: string): void {
  const db = getDB();
  if (!db || typeof db.runSync !== 'function') return;

  try {
    db.runSync(
      `UPDATE sync_queue 
       SET retry_count = retry_count + 1, status = 'failed', error_message = ?, updated_at = ?
       WHERE id = ?;`,
      [error, new Date().toISOString(), id]
    );
    if (invoiceId) {
      db.runSync(`UPDATE local_invoices SET sync_status = 'failed' WHERE id = ?;`, [invoiceId]);
    }
  } catch (e) {
    console.error('Error marking sync item failed:', e);
  }
}

/**
 * Fetch local invoices
 */
export function getLocalInvoices(businessId: string): Invoice[] {
  const db = getDB();
  if (!db || typeof db.getAllSync !== 'function') return [];

  try {
    const rows = db.getAllSync(
      `SELECT * FROM local_invoices WHERE business_id = ? ORDER BY created_at DESC;`,
      [businessId]
    ) as any[];

    return rows.map((r) => ({
      id: r.id,
      businessId: r.business_id,
      customerId: r.customer_id,
      createdBy: r.created_by,
      invoiceNumber: r.invoice_number,
      financialYear: r.financial_year,
      localId: r.local_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      subtotalPaise: r.subtotal_paise,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      discountPaise: r.discount_paise,
      cgstPaise: r.cgst_paise,
      sgstPaise: r.sgst_paise,
      igstPaise: r.igst_paise,
      totalTaxPaise: r.total_tax_paise,
      grandTotalPaise: r.grand_total_paise,
      paidAmountPaise: r.paid_amount_paise,
      balanceAmountPaise: r.balance_amount_paise,
      paymentStatus: r.payment_status,
      paymentMethod: r.payment_method,
      notes: r.notes,
      isVoid: r.is_void === 1,
      voidReason: r.void_reason,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Save products catalog in local SQLite cache
 */
export function cacheLocalProducts(products: Product[]): void {
  const db = getDB();
  if (!db || typeof db.runSync !== 'function') return;

  try {
    for (const p of products) {
      db.runSync(
        `INSERT OR REPLACE INTO local_products (
          id, business_id, category_id, name, name_tamil, sku, barcode,
          selling_price_paise, purchase_price_paise, unit, tax_rate,
          is_tax_inclusive, stock_quantity, low_stock_threshold,
          image_url, is_favourite, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          p.id,
          p.businessId,
          p.categoryId || null,
          p.name,
          p.nameTamil || null,
          p.sku || null,
          p.barcode || null,
          p.sellingPricePaise,
          p.purchasePricePaise || null,
          p.unit,
          p.taxRate,
          p.isTaxInclusive ? 1 : 0,
          p.stockQuantity,
          p.lowStockThreshold,
          p.imageUrl || null,
          p.isFavourite ? 1 : 0,
          p.isActive ? 1 : 0,
          p.updatedAt || new Date().toISOString()
        ]
      );
    }
  } catch (e) {
    console.error('Failed to cache products locally:', e);
  }
}

/**
 * Get cached local products
 */
export function getLocalProducts(businessId: string): Product[] {
  const db = getDB();
  if (!db || typeof db.getAllSync !== 'function') return [];

  try {
    const rows = db.getAllSync(
      `SELECT * FROM local_products WHERE business_id = ? AND is_active = 1;`,
      [businessId]
    ) as any[];

    return rows.map((r) => ({
      id: r.id,
      businessId: r.business_id,
      categoryId: r.category_id,
      name: r.name,
      nameTamil: r.name_tamil,
      sku: r.sku,
      barcode: r.barcode,
      sellingPricePaise: r.selling_price_paise,
      purchasePricePaise: r.purchase_price_paise,
      unit: r.unit,
      taxRate: r.tax_rate,
      isTaxInclusive: r.is_tax_inclusive === 1,
      stockQuantity: r.stock_quantity,
      lowStockThreshold: r.low_stock_threshold,
      imageUrl: r.image_url,
      isFavourite: r.is_favourite === 1,
      isActive: r.is_active === 1,
      createdAt: r.updated_at,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    return [];
  }
}

