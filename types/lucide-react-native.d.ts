declare module 'lucide-react-native' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';

  export interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type LucideIcon = React.FC<LucideProps>;

  export const ArrowLeft: LucideIcon;
  export const Settings: LucideIcon;
  export const Home: LucideIcon;
  export const Receipt: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Package: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Zap: LucideIcon;
  export const IndianRupee: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const PackagePlus: LucideIcon;
  export const Users: LucideIcon;
  export const ArrowUpDown: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Search: LucideIcon;
  export const X: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const User: LucideIcon;
  export const Share2: LucideIcon;
  export const Printer: LucideIcon;
  export const Tag: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Boxes: LucideIcon;
  export const Pencil: LucideIcon;
  export const Banknote: LucideIcon;
  export const QrCode: LucideIcon;
  export const CreditCard: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Split: LucideIcon;
  export const Utensils: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Cake: LucideIcon;
  export const Coffee: LucideIcon;
  export const Shirt: LucideIcon;
  export const Store: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Building2: LucideIcon;
  export const Camera: LucideIcon;
  export const FileText: LucideIcon;
  export const Download: LucideIcon;
  export const Phone: LucideIcon;
  export const MapPin: LucideIcon;
  export const Globe: LucideIcon;
  export const Sparkles: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const LogOut: LucideIcon;
  export const Trash2: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Check: LucideIcon;
  export const Lock: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Mail: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Clock: LucideIcon;
}
