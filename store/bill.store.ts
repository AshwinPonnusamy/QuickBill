import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CartItem,
  Product,
  Customer,
  DiscountType,
  BillCalculationResult,
  ProductUnit,
} from '../types';
import { calculateBill, normalizeQuantity } from '../utils/billingCalculator';

let customItemCounter = 0;

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

export const useBillStore = create<BillState>()(
  persist(
    (set, get) => {
      let cachedInputs: {
        cart: CartItem[];
        discountType: DiscountType;
        discountValue: number;
        isInterState: boolean;
      } | null = null;
      let cachedCalculation: BillCalculationResult | null = null;

      return {
        cart: [],
        customer: null,
        discountType: 'none',
        discountValue: 0,
        isInterState: false,
        notes: '',

        addToCart: (product, quantity = 1) => {
          const addQty = normalizeQuantity(quantity);
          set((state) => {
            const existingIndex = state.cart.findIndex((item) => item.productId === product.id);
            if (existingIndex > -1) {
              return {
                cart: state.cart.map((item, index) =>
                  index === existingIndex
                    ? { ...item, quantity: item.quantity + addQty }
                    : item
                ),
              };
            }

            const newItem: CartItem = {
              id: `cart-${product.id}-${++customItemCounter}`,
              productId: product.id,
              name: product.name,
              unit: product.unit,
              quantity: addQty,
              unitPricePaise: product.sellingPricePaise,
              taxRate: product.taxRate,
              isTaxInclusive: product.isTaxInclusive,
            };
            return { cart: [...state.cart, newItem] };
          });
        },

        updateQuantity: (itemId, quantity) => {
          set((state) => {
            if (!Number.isFinite(quantity) || quantity <= 0) {
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
              id: `custom-${Date.now()}-${++customItemCounter}`,
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
          if (
            cachedInputs &&
            cachedCalculation &&
            cachedInputs.cart === cart &&
            cachedInputs.discountType === discountType &&
            cachedInputs.discountValue === discountValue &&
            cachedInputs.isInterState === isInterState
          ) {
            return cachedCalculation;
          }

          cachedInputs = { cart, discountType, discountValue, isInterState };
          cachedCalculation = calculateBill(cart, discountType, discountValue, isInterState);
          return cachedCalculation;
        },
      };
    },
    {
      name: 'qb_active_bill_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cart: state.cart,
        customer: state.customer,
        discountType: state.discountType,
        discountValue: state.discountValue,
        isInterState: state.isInterState,
        notes: state.notes,
      }),
    }
  )
);
