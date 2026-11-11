export const HERO_COLORS = {
  primary: '#15324B',
  primaryForeground: '#FFFFFF',
  primaryLight: '#EEF4F9',

  secondary: '#087E8B',
  secondaryForeground: '#FFFFFF',
  secondaryLight: '#E6F8FA',

  success: '#17C964',
  successForeground: '#FFFFFF',
  successLight: '#E8FAF0',

  warning: '#F5A524',
  warningForeground: '#FFFFFF',
  warningLight: '#FEF6E6',

  danger: '#F31260',
  dangerForeground: '#FFFFFF',
  dangerLight: '#FEE7EF',

  default: '#71717A',
  defaultForeground: '#FFFFFF',
  defaultLight: '#F4F4F5',
  defaultBorder: '#E4E4E7',

  background: '#F4F7FA',
  content1: '#FFFFFF',
  content2: '#F4F4F5',
  content3: '#E4E4E7',
  foreground: '#11181C',
  foregroundMuted: '#71717A',
};

export const HERO_RADIUS = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export type HeroColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
export type HeroVariant = 'solid' | 'bordered' | 'flat' | 'faded' | 'light' | 'shadow';
export type HeroSize = 'sm' | 'md' | 'lg';
export type HeroRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

