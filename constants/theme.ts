import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// ─────────────────────────────────────────────────────────
// QuickBill Fresh Modern Theme — Vibrant & User-Friendly
// ─────────────────────────────────────────────────────────

export const COLORS = {
  // Primary — rich indigo-blue (modern, trustworthy)
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#818CF8',
  primaryContainer: '#EEF2FF',
  onPrimaryContainer: '#312E81',

  // Secondary — vibrant teal-green (action-oriented)
  secondary: '#0D9488',
  secondaryDark: '#0F766E',
  secondaryLight: '#2DD4BF',
  secondaryContainer: '#CCFBF1',
  onSecondaryContainer: '#134E4A',

  // Accent — warm amber for highlights
  accent: '#F59E0B',
  accentLight: '#FEF3C7',

  // Backgrounds — warm off-white for a softer feel
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceDisabled: '#E2E8F0',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  successBorder: '#86EFAC',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',

  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorBorder: '#FCA5A5',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  shadowColor: '#1E293B',

  // Gradient stops (for hero cards, headers, etc.)
  gradientStart: '#4F46E5',
  gradientEnd: '#7C3AED',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const ROUNDNESS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const AppPaperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    onPrimary: COLORS.white,
    primaryContainer: COLORS.primaryContainer,
    onPrimaryContainer: COLORS.onPrimaryContainer,
    secondary: COLORS.secondary,
    onSecondary: COLORS.white,
    secondaryContainer: COLORS.secondaryContainer,
    onSecondaryContainer: COLORS.onSecondaryContainer,
    background: COLORS.background,
    surface: COLORS.surface,
    surfaceVariant: COLORS.surfaceVariant,
    error: COLORS.error,
    outline: COLORS.border,
  },
  roundness: 14,
};
