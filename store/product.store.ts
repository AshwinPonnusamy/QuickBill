import { create } from 'zustand';
import { Product, Category } from '../types';

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

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  categories: [],
  selectedCategoryId: null,
  searchQuery: '',
  isLoading: false,

  setProducts: (products) => set({ products }),

  setCategories: (categories) => set({ categories }),

  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addProduct: (product) => {
    set((state) => ({ products: [product, ...state.products] }));
  },

  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
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
