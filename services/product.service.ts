import { supabase, isSupabaseConfigured } from "./supabase";
import { Product, Category } from "../types";
import { useBusinessStore } from "../store/business.store";
import { can } from "../utils/permissions";
import { checkAndLogoutIfSuspended } from "./sessionGuard";

const CONFIG_ERROR =
  "Supabase is not configured. Please check your environment variables.";

const mapProductRow = (p: any): Product => ({
  id: p.id,
  businessId: p.business_id,
  categoryId: p.category_id || undefined,
  name: p.name,
  sku: p.sku || undefined,
  barcode: p.barcode || undefined,
  sellingPricePaise: Number(p.selling_price_paise),
  purchasePricePaise: p.purchase_price_paise
    ? Number(p.purchase_price_paise)
    : undefined,
  unit: p.unit,
  taxRate: Number(p.tax_rate),
  isTaxInclusive: Boolean(p.is_tax_inclusive),
  stockQuantity: Number(p.stock_quantity),
  lowStockThreshold: Number(p.low_stock_threshold),
  imageUrl: p.image_url || undefined,
  isFavourite: Boolean(p.is_favourite),
  isActive: Boolean(p.is_active),
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

const OWNER_PRODUCT_COLUMNS =
  "id, business_id, category_id, name, sku, barcode, selling_price_paise, purchase_price_paise, unit, tax_rate, is_tax_inclusive, stock_quantity, low_stock_threshold, image_url, is_favourite, is_active, created_at, updated_at";

const STAFF_SAFE_PRODUCT_COLUMNS =
  "id, business_id, category_id, name, sku, barcode, selling_price_paise, unit, tax_rate, is_tax_inclusive, stock_quantity, low_stock_threshold, image_url, is_favourite, is_active, created_at, updated_at";

export const productService = {
  /**
   * Fetch all active products for a business from Supabase.
   * Selects explicit columns instead of `*`, and omits purchase_price_paise for staff.
   */
  async getProducts(businessId: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) return [];

    const { role, isRoleLoaded } = useBusinessStore.getState();
    const includeCostPrice = isRoleLoaded && can(role, "view_cost_price");

    try {
      if (includeCostPrice) {
        // Hardened DB path: purchase_price_paise is revoked from direct SELECT and
        // exposed to owners/admins via SECURITY DEFINER get_products_with_cost RPC.
        const rpcRes = await supabase.rpc("get_products_with_cost", {
          p_business_id: businessId,
        });
        if (rpcRes && !rpcRes.error && Array.isArray(rpcRes.data)) {
          return rpcRes.data.map(mapProductRow);
        }

        // Legacy/pre-migration fallback
        const { data, error } = await supabase
          .from("products")
          .select(OWNER_PRODUCT_COLUMNS)
          .eq("business_id", businessId)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error || !data) {
          console.warn("Error fetching products:", error?.message);
          return [];
        }

        return data.map(mapProductRow);
      }

      // Staff/restricted path: use products_staff_view without purchase_price_paise
      const { data: viewData, error: viewError } = await supabase
        .from("products_staff_view")
        .select(STAFF_SAFE_PRODUCT_COLUMNS)
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!viewError && viewData) {
        return viewData.map(mapProductRow);
      }

      // Fallback if view is not yet migrated: still omit purchase_price_paise
      const { data, error } = await supabase
        .from("products")
        .select(STAFF_SAFE_PRODUCT_COLUMNS)
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error || !data) {
        console.warn("Error fetching products:", error?.message);
        await checkAndLogoutIfSuspended(error?.message);
        return [];
      }

      return data.map(mapProductRow);
    } catch (e: any) {
      console.warn("Error fetching products:", e.message);
      return [];
    }
  },

  /**
   * Fetch active categories for a business from Supabase
   */
  async getCategories(businessId: string): Promise<Category[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error || !data) return [];

      return data.map((c) => ({
        id: c.id,
        businessId: c.business_id,
        name: c.name,
        icon: c.icon || undefined,
        color: c.color || undefined,
        isActive: Boolean(c.is_active),
        createdAt: c.created_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Create category in Supabase
   */
  async createCategory(
    businessId: string,
    name: string,
  ): Promise<Category | null> {
    if (!isSupabaseConfigured()) return null;

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "manage_products")) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          business_id: businessId,
          name: name.trim(),
        })
        .select()
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        businessId: data.business_id,
        name: data.name,
        icon: data.icon || undefined,
        color: data.color || undefined,
        isActive: Boolean(data.is_active),
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  },

  /**
   * Create or update a product directly in Supabase
   */
  async saveProduct(
    businessId: string,
    product: Omit<Product, "id" | "businessId" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<{ product: Product | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { product: null, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "manage_products")) {
      return { product: null, error: "Not permitted" };
    }

    const payload = {
      business_id: businessId,
      category_id: product.categoryId || null,
      name: product.name,
      sku: product.sku || null,
      barcode: product.barcode || null,
      selling_price_paise: product.sellingPricePaise,
      purchase_price_paise: product.purchasePricePaise ?? null,
      unit: product.unit,
      tax_rate: product.taxRate,
      is_tax_inclusive: product.isTaxInclusive,
      stock_quantity: product.stockQuantity,
      low_stock_threshold: product.lowStockThreshold,
      image_url: product.imageUrl || null,
      is_favourite: product.isFavourite,
      is_active: product.isActive,
    };

    try {
      if (!product.id) {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select(STAFF_SAFE_PRODUCT_COLUMNS)
          .single();

        if (error || !data) {
          return {
            product: null,
            error: error?.message || "Failed to save product",
          };
        }
        const mapped = mapProductRow(data);
        return {
          product: {
            ...mapped,
            purchasePricePaise:
              mapped.purchasePricePaise ?? product.purchasePricePaise,
          },
        };
      }

      const { data, error } = await supabase
        .from("products")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .eq("business_id", businessId)
        .select(STAFF_SAFE_PRODUCT_COLUMNS)
        .single();

      if (error || !data) {
        return {
          product: null,
          error: error?.message || "Failed to update product",
        };
      }
      const mapped = mapProductRow(data);
      return {
        product: {
          ...mapped,
          purchasePricePaise:
            mapped.purchasePricePaise ?? product.purchasePricePaise,
        },
      };
    } catch (err: any) {
      return { product: null, error: err.message || "Failed to save product" };
    }
  },

  /**
   * Adjust stock atomically via adjust_stock RPC (locks product row FOR UPDATE,
   * sets stock_movements.created_by = auth.uid(), and returns authoritative new stock).
   */
  async recordStockAdjustment(
    businessId: string,
    productId: string,
    movementType: "adjustment" | "purchase" | "return",
    quantity: number,
    currentStock: number,
    reason: string,
  ): Promise<{ success: boolean; newStock: number; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, newStock: currentStock, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "adjust_stock")) {
      return { success: false, newStock: currentStock, error: "Not permitted" };
    }

    try {
      const { data, error } = await supabase.rpc("adjust_stock", {
        p_business_id: businessId,
        p_product_id: productId,
        p_movement_type: movementType,
        p_quantity: quantity,
        p_reason: reason,
      });

      if (error) {
        await checkAndLogoutIfSuspended(error.message);
        return { success: false, newStock: currentStock, error: error.message };
      }

      const newStock =
        data !== null && data !== undefined && !Number.isNaN(Number(data))
          ? Number(data)
          : Math.max(
              0,
              movementType === "return"
                ? currentStock - quantity
                : currentStock + quantity,
            );

      return { success: true, newStock };
    } catch (e: any) {
      return {
        success: false,
        newStock: currentStock,
        error: e.message || "Stock adjustment failed",
      };
    }
  },

  /**
   * Deactivate product in Supabase
   */
  async deleteProduct(
    businessId: string,
    productId: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: CONFIG_ERROR };
    }

    const { role, isRoleLoaded } = useBusinessStore.getState();
    if (!isRoleLoaded || !can(role, "manage_products")) {
      return { success: false, error: "Not permitted" };
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", productId)
        .eq("business_id", businessId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to delete product" };
    }
  },
};
