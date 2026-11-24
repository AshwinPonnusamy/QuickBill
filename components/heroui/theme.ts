export const HERO_COLORS = {
  primary: '#4F46E5',
  primaryForeground: '#FFFFFF',
  primaryLight: '#EEF2FF',

  secondary: '#0D9488',
  secondaryForeground: '#FFFFFF',
  secondaryLight: '#CCFBF1',

  success: '#16A34A',
  successForeground: '#FFFFFF',
  successLight: '#DCFCE7',

  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  warningLight: '#FEF3C7',

  danger: '#EF4444',
  dangerForeground: '#FFFFFF',
  dangerLight: '#FEE2E2',

  default: '#64748B',
  defaultForeground: '#FFFFFF',
  defaultLight: '#F1F5F9',
  defaultBorder: '#E2E8F0',

  background: '#F8FAFC',
  content1: '#FFFFFF',
  content2: '#F1F5F9',
  content3: '#E2E8F0',
  foreground: '#0F172A',
  foregroundMuted: '#64748B',
};

export const HERO_RADIUS = {
  none: 0,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export type HeroColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
export type HeroVariant = 'solid' | 'bordered' | 'flat' | 'faded' | 'light' | 'shadow';
export type HeroSize = 'sm' | 'md' | 'lg';
export type HeroRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
