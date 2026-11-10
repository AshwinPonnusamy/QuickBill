import { create } from 'zustand';
import { Profile, SupportedLanguage } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  language: SupportedLanguage;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: any | null, profile: Profile | null) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setProfile: (profile: Profile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  language: 'en',
  isLoading: false,
  isAuthenticated: false,

  setAuth: (user, profile) => {
    set({
      user,
      profile,
      isAuthenticated: !!user,
      language: profile?.preferredLanguage || 'en',
    });
  },

  setLanguage: (language) => {
    AsyncStorage.setItem('qb_language', language).catch(console.error);
    set((state) => ({
      language,
      profile: state.profile ? { ...state.profile, preferredLanguage: language } : null,
    }));
  },

  setProfile: (profile) => set({ profile }),

  logout: () => {
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
    });
  },
}));

