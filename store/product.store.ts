import { create } from 'zustand';
import { Product, Category } from '../types';
import { cacheLocalProducts } from '../database/sqlite';

interface ProductState {
  products: Product[];
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

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,

  setProducts: (products) => {
    cacheLocalProducts(products);
    set({ products });
  },

  setCategories: (categories) => set({ categories }),

  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addProduct: (product) => {
    set((state) => {
      const next = [product, ...state.products];
      cacheLocalProducts(next);
      return { products: next };
    });
  },

  updateProduct: (id, updates) => {
    set((state) => {
      const next = state.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
      cacheLocalProducts(next);
      return { products: next };
    });
  },

  deleteProduct: (id) => {
    set((state) => {
      const next = state.products.filter((p) => p.id !== id);
      cacheLocalProducts(next);
      return { products: next };
    });
  },

  adjustStock: (productId, quantityChange) => {
    set((state) => {
      const next = state.products.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity + quantityChange);
          return { ...p, stockQuantity: newQty };
        }
        return p;
      });
      cacheLocalProducts(next);
      return { products: next };
    });
  },
}));

