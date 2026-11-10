import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#15324B',
  primaryDark: '#0D2133',
  primaryLight: '#264D70',
  primaryContainer: '#E3ECF5',
  onPrimaryContainer: '#0D2133',

  secondary: '#087E8B',
  secondaryDark: '#05565E',
  secondaryLight: '#0EABC7',
  secondaryContainer: '#D1F4F9',
  onSecondaryContainer: '#043B41',

  background: '#F4F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#EAEFF5',
  surfaceDisabled: '#E2E8F0',

  textPrimary: '#181C1E',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  success: '#16A34A',
  successLight: '#DCFCE7',
  successBorder: '#86EFAC',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',

  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorBorder: '#FCA5A5',

  white: '#FFFFFF',
  black: '#000000',

  shadowColor: '#15324B',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
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
  roundness: 12,
};

