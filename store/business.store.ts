import { create } from 'zustand';
import { Business, Subscription, UserRole } from '../types';

interface BusinessState {
  business: Business | null;
  subscription: Subscription | null;
  role: UserRole;
  isRoleLoaded: boolean;
  isLoading: boolean;
  setBusiness: (business: Business | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setRole: (role: UserRole) => void;
  setRoleLoaded: (loaded: boolean) => void;
  resetBusinessSession: () => void;
  updateBusiness: (updates: Partial<Business>) => void;
  isPro: () => boolean;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  business: null,
  subscription: null,
  // Fail closed: never grant owner/admin privileges until DB role is verified
  role: 'staff',
  isRoleLoaded: false,
  isLoading: false,

  setBusiness: (business) =>
    set((state) => ({
      business,
      ...(business === null
        ? { role: 'staff' as UserRole, isRoleLoaded: false, subscription: null }
        : { role: state.role }),
    })),

  setSubscription: (subscription) => set({ subscription }),

  setRole: (role) => set({ role, isRoleLoaded: true }),

  setRoleLoaded: (isRoleLoaded) => set({ isRoleLoaded }),

  resetBusinessSession: () =>
    set({
      business: null,
      subscription: null,
      role: 'staff',
      isRoleLoaded: false,
    }),

  updateBusiness: (updates) => {
    set((state) => {
      if (!state.business) return state;
      return {
        business: { ...state.business, ...updates, updatedAt: new Date().toISOString() },
      };
    });
  },

  isPro: () => {
    const sub = get().subscription;
    return sub?.plan === 'pro' && (sub.status === 'active' || sub.status === 'trialing');
  },
}));
