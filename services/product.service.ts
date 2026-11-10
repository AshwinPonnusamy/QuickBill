import { supabase, isSupabaseConfigured } from './supabase';
import { Product, Category, StockMovement } from '../types';
import { 
  cacheLocalProducts, 
  getLocalProducts, 
  getDB, 
  enqueueSyncItem 
} from '../database/sqlite';

export const productService = {
  /**
   * Fetch all products for a business.
   * Pulls from Supabase if online, caches in SQLite, or falls back to SQLite offline.
   */
  async getProducts(businessId: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      return getLocalProducts(businessId);
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error || !data) {
        return getLocalProducts(businessId);
      }

      const products: Product[] = data.map((p) => ({
        id: p.id,
        businessId: p.business_id,
        categoryId: p.category_id,
        name: p.name,
        nameTamil: p.name_tamil,
        sku: p.sku,
        barcode: p.barcode,
        sellingPricePaise: Number(p.selling_price_paise),
        purchasePricePaise: p.purchase_price_paise ? Number(p.purchase_price_paise) : undefined,
        unit: p.unit,
        taxRate: Number(p.tax_rate),
        isTaxInclusive: p.is_tax_inclusive,
        stockQuantity: Number(p.stock_quantity),
        lowStockThreshold: Number(p.low_stock_threshold),
        imageUrl: p.image_url,
        isFavourite: p.is_favourite,
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      // Cache locally in SQLite
      cacheLocalProducts(products);
      return products;
    } catch (e) {
      return getLocalProducts(businessId);
    }
  },

  /**
   * Fetch categories for a business
   */
  async getCategories(businessId: string): Promise<Category[]> {
    if (!isSupabaseConfigured()) {
      const defaultCategories: Category[] = [
        { id: 'cat-1', businessId, name: 'Beverages / Tea / Coffee', nameTamil: 'பானங்கள் / தேநீர்', isActive: true, createdAt: new Date().toISOString() },
        { id: 'cat-2', businessId, name: 'Snacks & Sweets', nameTamil: 'தின்பண்டங்கள்', isActive: true, createdAt: new Date().toISOString() },
        { id: 'cat-3', businessId, name: 'Meals / Tiffin', nameTamil: 'உணவு / டிபன்', isActive: true, createdAt: new Date().toISOString() },
        { id: 'cat-4', businessId, name: 'Groceries / Provisions', nameTamil: 'மளிகைப் பொருட்கள்', isActive: true, createdAt: new Date().toISOString() },
        { id: 'cat-5', businessId, name: 'Dairy & Bakery', nameTamil: 'பால் & பேக்கரி', isActive: true, createdAt: new Date().toISOString() },
      ];
      return defaultCategories;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error || !data) return [];

      return data.map((c) => ({
        id: c.id,
        businessId: c.business_id,
        name: c.name,
        nameTamil: c.name_tamil,
        icon: c.icon,
        color: c.color,
        isActive: c.is_active,
        createdAt: c.created_at,
      }));
    } catch (e) {
      return [];
    }
  },

  /**
   * Create category
   */
  async createCategory(businessId: string, name: string, nameTamil?: string): Promise<Category | null> {
    const id = `cat-${Date.now()}`;
    const newCategory: Category = {
      id,
      businessId,
      name,
      nameTamil,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      return newCategory;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          business_id: businessId,
          name,
          name_tamil: nameTamil,
        })
        .select()
        .single();

      if (error || !data) return newCategory;
      return {
        id: data.id,
        businessId: data.business_id,
        name: data.name,
        nameTamil: data.name_tamil,
        isActive: data.is_active,
        createdAt: data.created_at,
      };
    } catch (e) {
      return newCategory;
    }
  },

  /**
   * Create or update a product
   */
  async saveProduct(
    businessId: string,
    product: Omit<Product, 'businessId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ product: Product | null; error?: string }> {
    const isNew = !product.id || product.id.startsWith('temp-');
    const id = isNew ? `prod-${Date.now()}` : product.id;

    const fullProduct: Product = {
      ...product,
      id,
      businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache locally immediately
    cacheLocalProducts([fullProduct]);

    if (!isSupabaseConfigured()) {
      return { product: fullProduct };
    }

    try {
      const payload = {
        id: isNew ? undefined : product.id,
        business_id: businessId,
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
      };

      const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        // Enqueue to sync queue for offline retry
        enqueueSyncItem({
          id: `sync-prod-${id}`,
          businessId,
          entityType: 'product',
          entityId: id,
          operation: isNew ? 'insert' : 'update',
          payload: JSON.stringify(fullProduct),
          retryCount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return { product: fullProduct };
      }

      const returned: Product = {
        ...fullProduct,
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      cacheLocalProducts([returned]);
      return { product: returned };
    } catch (err: any) {
      return { product: fullProduct };
    }
  },

  /**
   * Adjust stock and log stock movement
   */
  async recordStockAdjustment(
    businessId: string,
    productId: string,
    movementType: 'adjustment' | 'purchase' | 'return',
    quantity: number,
    currentStock: number,
    reason: string
  ): Promise<{ success: boolean; newStock: number; error?: string }> {
    const newStock = movementType === 'return' ? currentStock - quantity : currentStock + quantity;

    // Update local cache
    const db = getDB();
    if (db && typeof db.runSync === 'function') {
      try {
        db.runSync(`UPDATE local_products SET stock_quantity = ? WHERE id = ?;`, [newStock, productId]);
      } catch (e) {}
    }

    if (!isSupabaseConfigured()) {
      return { success: true, newStock };
    }

    try {
      await supabase.from('products').update({ stock_quantity: newStock, updated_at: new Date().toISOString() }).eq('id', productId);
      await supabase.from('stock_movements').insert({
        business_id: businessId,
        product_id: productId,
        movement_type: movementType,
        quantity,
        previous_stock: currentStock,
        new_stock: newStock,
        reason,
      });
      return { success: true, newStock };
    } catch (e: any) {
      return { success: true, newStock };
    }
  },
};

