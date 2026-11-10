import { create } from 'zustand';
import { 
  CartItem, 
  Product, 
  Customer, 
  DiscountType, 
  BillCalculationResult, 
  ProductUnit 
} from '../types';
import { calculateBill } from '../utils/billingCalculator';

interface BillState {
  cart: CartItem[];
  customer: Customer | null;
  discountType: DiscountType;
  discountValue: number;
  isInterState: boolean;
  notes: string;

  // Actions
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  addCustomItem: (name: string, pricePaise: number, taxRate?: number, unit?: ProductUnit) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  setIsInterState: (isInterState: boolean) => void;
  setNotes: (notes: string) => void;
  clearBill: () => void;
  getCalculation: () => BillCalculationResult;
}

export const useBillStore = create<BillState>((set, get) => ({
  cart: [],
  customer: null,
  discountType: 'none',
  discountValue: 0,
  isInterState: false,
  notes: '',

  addToCart: (product, quantity = 1) => {
    set((state) => {
      const existingIndex = state.cart.findIndex((item) => item.productId === product.id);
      if (existingIndex > -1) {
        const nextCart = [...state.cart];
        nextCart[existingIndex].quantity += quantity;
        return { cart: nextCart };
      }

      const newItem: CartItem = {
        id: `cart-${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        nameTamil: product.nameTamil,
        unit: product.unit,
        quantity,
        unitPricePaise: product.sellingPricePaise,
        taxRate: product.taxRate,
        isTaxInclusive: product.isTaxInclusive,
      };
      return { cart: [...state.cart, newItem] };
    });
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((i) => i.id !== itemId) };
      }
      return {
        cart: state.cart.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      };
    });
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      cart: state.cart.filter((i) => i.id !== itemId),
    }));
  },

  addCustomItem: (name, pricePaise, taxRate = 0, unit = 'item') => {
    set((state) => {
      const customItem: CartItem = {
        id: `custom-${Date.now()}`,
        name,
        unit,
        quantity: 1,
        unitPricePaise: pricePaise,
        taxRate,
        isTaxInclusive: false,
      };
      return { cart: [...state.cart, customItem] };
    });
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discountType, discountValue) => set({ discountType, discountValue }),

  setIsInterState: (isInterState) => set({ isInterState }),

  setNotes: (notes) => set({ notes }),

  clearBill: () => {
    set({
      cart: [],
      customer: null,
      discountType: 'none',
      discountValue: 0,
      isInterState: false,
      notes: '',
    });
  },

  getCalculation: () => {
    const { cart, discountType, discountValue, isInterState } = get();
    return calculateBill(cart, discountType, discountValue, isInterState);
  },
}));

