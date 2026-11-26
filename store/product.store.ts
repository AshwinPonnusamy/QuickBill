import { create } from 'zustand';
import { Product, Category } from '../types';

export const buildProductSearchKey = (p: Product): string =>
  [p.name, p.sku, p.barcode].filter(Boolean).join(' ').toLowerCase();

const indexSearchKeys = (products: Product[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    map[p.id] = buildProductSearchKey(p);
  }
  return map;
};

interface ProductState {
  products: Product[];
  searchKeysById: Record<string, string>;
  categories: Category[];
  selectedCategoryId: string | null;
  searchQuery: string;
  isLoading: boolean;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSelectedCategoryId: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, quantityChange: number) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  searchKeysById: {},
  categories: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,

  setProducts: (products) =>
    set({
      products,
      searchKeysById: indexSearchKeys(products),
    }),

  setCategories: (categories) => set({ categories }),

  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addProduct: (product) => {
    set((state) => ({
      products: [product, ...state.products],
      searchKeysById: {
        ...state.searchKeysById,
        [product.id]: buildProductSearchKey(product),
      },
    }));
  },

  updateProduct: (id, updates) => {
    set((state) => {
      let nextSearchKeys = state.searchKeysById;
      const products = state.products.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...updates };
        nextSearchKeys = {
          ...nextSearchKeys,
          [id]: buildProductSearchKey(merged),
        };
        return merged;
      });
      return { products, searchKeysById: nextSearchKeys };
    });
  },

  deleteProduct: (id) => {
    set((state) => {
      const nextSearchKeys = { ...state.searchKeysById };
      delete nextSearchKeys[id];
      return {
        products: state.products.filter((p) => p.id !== id),
        searchKeysById: nextSearchKeys,
      };
    });
  },

  adjustStock: (productId, quantityChange) => {
    set((state) => ({
      products: state.products.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity + quantityChange);
          return { ...p, stockQuantity: newQty };
        }
        return p;
      }),
    }));
  },
}));
