import { create } from 'zustand';
import { Business, Subscription, UserRole } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BusinessState {
  business: Business | null;
  subscription: Subscription | null;
  role: UserRole;
  isLoading: boolean;
  setBusiness: (business: Business | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setRole: (role: UserRole) => void;
  updateBusiness: (updates: Partial<Business>) => void;
  isPro: () => boolean;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  business: null,
  subscription: null,
  role: 'owner',
  isLoading: false,

  setBusiness: (business) => {
    if (business) {
      AsyncStorage.setItem('qb_active_business', JSON.stringify(business)).catch(console.error);
    }
    set({ business });
  },

  setSubscription: (subscription) => set({ subscription }),
  
  setRole: (role) => set({ role }),

  updateBusiness: (updates) => {
    set((state) => {
      if (!state.business) return state;
      const updated = { ...state.business, ...updates, updatedAt: new Date().toISOString() };
      AsyncStorage.setItem('qb_active_business', JSON.stringify(updated)).catch(console.error);
      return { business: updated };
    });
  },

  isPro: () => {
    const sub = get().subscription;
    return sub?.plan === 'pro' && (sub.status === 'active' || sub.status === 'trialing');
  },
}));

