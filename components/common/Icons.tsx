import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Polyline,
  Polygon,
  SvgProps,
} from 'react-native-svg';

export interface IconProps extends SvgProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

const createIcon = (name: string, renderPaths: (props: IconProps) => React.ReactNode) => {
  const Component: React.FC<IconProps> = ({
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    style,
    ...props
  }) => {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
        {...props}
      >
        {renderPaths({ size, color, strokeWidth, ...props })}
      </Svg>
    );
  };
  Component.displayName = name;
  return Component;
};

export const ArrowLeft = createIcon('ArrowLeft', () => (
  <>
    <Path d="m12 19-7-7 7-7" />
    <Path d="M19 12H5" />
  </>
));

export const ArrowRight = createIcon('ArrowRight', () => (
  <>
    <Path d="M5 12h14" />
    <Path d="m12 5 7 7-7 7" />
  </>
));

export const Settings = createIcon('Settings', () => (
  <>
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx="12" cy="12" r="3" />
  </>
));

export const Home = createIcon('Home', () => (
  <>
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </>
));

export const Receipt = createIcon('Receipt', () => (
  <>
    <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <Path d="M16 8H8" />
    <Path d="M16 12H8" />
    <Path d="M12 16H8" />
  </>
));

export const Plus = createIcon('Plus', () => (
  <>
    <Path d="M5 12h14" />
    <Path d="M12 5v14" />
  </>
));

export const Minus = createIcon('Minus', () => (
  <Path d="M5 12h14" />
));

export const Package = createIcon('Package', () => (
  <>
    <Path d="m16.5 9.4-9-5.19" />
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <Polyline points="3.29 7 12 12 20.71 7" />
    <Line x1="12" y1="22" x2="12" y2="12" />
  </>
));

export const BarChart3 = createIcon('BarChart3', () => (
  <>
    <Path d="M3 3v18h18" />
    <Path d="M18 17V9" />
    <Path d="M13 17V5" />
    <Path d="M8 17v-3" />
  </>
));

export const Zap = createIcon('Zap', () => (
  <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
));

export const IndianRupee = createIcon('IndianRupee', () => (
  <>
    <Path d="M6 3h12" />
    <Path d="M6 8h12" />
    <Path d="m6 13 8.5 8" />
    <Path d="M6 13h3" />
    <Path d="M9 13c6.667 0 6.667-10 0-10" />
  </>
));

export const CheckCircle2 = createIcon('CheckCircle2', () => (
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="m9 12 2 2 4-4" />
  </>
));

export const Check = createIcon('Check', () => (
  <Polyline points="20 6 9 17 4 12" />
));

export const AlertCircle = createIcon('AlertCircle', () => (
  <>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </>
));

export const AlertTriangle = createIcon('AlertTriangle', () => (
  <>
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Line x1="12" y1="9" x2="12" y2="13" />
    <Line x1="12" y1="17" x2="12.01" y2="17" />
  </>
));

export const PackagePlus = createIcon('PackagePlus', () => (
  <>
    <Path d="M16 16h6" />
    <Path d="M19 13v6" />
    <Path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
    <Polyline points="3.29 7 12 12 20.71 7" />
    <Line x1="12" y1="22" x2="12" y2="12" />
  </>
));

export const Users = createIcon('Users', () => (
  <>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
));

export const User = createIcon('User', () => (
  <>
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </>
));

export const ArrowUpDown = createIcon('ArrowUpDown', () => (
  <>
    <Path d="m21 16-4 4-4-4" />
    <Path d="M17 20V4" />
    <Path d="m3 8 4-4 4 4" />
    <Path d="M7 4v16" />
  </>
));

export const TrendingUp = createIcon('TrendingUp', () => (
  <>
    <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <Polyline points="16 7 22 7 22 13" />
  </>
));

export const Search = createIcon('Search', () => (
  <>
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>
));

export const X = createIcon('X', () => (
  <>
    <Path d="M18 6 6 18" />
    <Path d="m6 6 12 12" />
  </>
));

export const FolderOpen = createIcon('FolderOpen', () => (
  <Path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
));

export const Share2 = createIcon('Share2', () => (
  <>
    <Circle cx="18" cy="5" r="3" />
    <Circle cx="6" cy="12" r="3" />
    <Circle cx="18" cy="19" r="3" />
    <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>
));

export const Printer = createIcon('Printer', () => (
  <>
    <Polyline points="6 9 6 2 18 2 18 9" />
    <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <Rect x="6" y="14" width="12" height="8" />
  </>
));

export const Tag = createIcon('Tag', () => (
  <>
    <Path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <Path d="M7 7h.01" />
  </>
));

export const ChevronDown = createIcon('ChevronDown', () => (
  <Path d="m6 9 6 6 6-6" />
));

export const ChevronRight = createIcon('ChevronRight', () => (
  <Path d="m9 18 6-6-6-6" />
));

export const Boxes = createIcon('Boxes', () => (
  <>
    <Path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <Path d="m7 16.5-4.74-2.85" />
    <Path d="m7 16.5 5-3" />
    <Path d="M7 16.5v5.17" />
    <Path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <Path d="m17 16.5-5-3" />
    <Path d="m17 16.5 4.74-2.85" />
    <Path d="M17 16.5v5.17" />
    <Path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <Path d="M12 8 7.26 5.15" />
    <Path d="m12 8 4.74-2.85" />
    <Path d="M12 13.5V8" />
  </>
));

export const Pencil = createIcon('Pencil', () => (
  <>
    <Path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <Path d="m15 5 4 4" />
  </>
));

export const Banknote = createIcon('Banknote', () => (
  <>
    <Rect width="20" height="12" x="2" y="6" rx="2" />
    <Circle cx="12" cy="12" r="2" />
    <Path d="M6 12h.01M18 12h.01" />
  </>
));

export const QrCode = createIcon('QrCode', () => (
  <>
    <Rect width="5" height="5" x="3" y="3" rx="1" />
    <Rect width="5" height="5" x="16" y="3" rx="1" />
    <Rect width="5" height="5" x="3" y="16" rx="1" />
    <Path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <Path d="M21 21v.01" />
    <Path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <Path d="M3 12h.01" />
    <Path d="M12 3h.01" />
    <Path d="M12 16v.01" />
    <Path d="M16 12h1" />
    <Path d="M21 12v.01" />
    <Path d="M12 21v-1" />
  </>
));

export const CreditCard = createIcon('CreditCard', () => (
  <>
    <Rect width="20" height="14" x="2" y="5" rx="2" />
    <Line x1="2" x2="22" y1="10" y2="10" />
  </>
));

export const BookOpen = createIcon('BookOpen', () => (
  <>
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </>
));

export const Split = createIcon('Split', () => (
  <>
    <Path d="M16 3h5v5" />
    <Path d="M8 3H3v5" />
    <Path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
    <Path d="m15 9 6-6" />
  </>
));

export const Utensils = createIcon('Utensils', () => (
  <>
    <Path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
    <Path d="M15 2v14a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2V2" />
    <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </>
));

export const ShoppingCart = createIcon('ShoppingCart', () => (
  <>
    <Circle cx="8" cy="21" r="1" />
    <Circle cx="19" cy="21" r="1" />
    <Path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </>
));

export const Cake = createIcon('Cake', () => (
  <>
    <Path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
    <Path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
    <Path d="M2 21h20" />
    <Path d="M7 8v3" />
    <Path d="M12 8v3" />
    <Path d="M17 8v3" />
  </>
));

export const Coffee = createIcon('Coffee', () => (
  <>
    <Path d="M10 2v2" />
    <Path d="M14 2v2" />
    <Path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12Z" />
    <Path d="M6 2v2" />
    <Path d="M17 10h1a3 3 0 0 1 0 6h-1" />
  </>
));

export const Shirt = createIcon('Shirt', () => (
  <Path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
));

export const Store = createIcon('Store', () => (
  <>
    <Path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
    <Path d="M2 7h20" />
  </>
));

export const ShoppingBag = createIcon('ShoppingBag', () => (
  <>
    <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <Path d="M3 6h18" />
    <Path d="M16 10a4 4 0 0 1-8 0" />
  </>
));

export const Building2 = createIcon('Building2', () => (
  <>
    <Path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <Path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <Path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <Path d="M10 6h4" />
    <Path d="M10 10h4" />
    <Path d="M10 14h4" />
    <Path d="M10 18h4" />
  </>
));

export const Camera = createIcon('Camera', () => (
  <>
    <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <Circle cx="12" cy="13" r="3" />
  </>
));

export const FileText = createIcon('FileText', () => (
  <>
    <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <Path d="M10 9H8" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
  </>
));

export const Download = createIcon('Download', () => (
  <>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1="12" x2="12" y1="15" y2="3" />
  </>
));

export const Phone = createIcon('Phone', () => (
  <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
));

export const MapPin = createIcon('MapPin', () => (
  <>
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <Circle cx="12" cy="10" r="3" />
  </>
));

export const Globe = createIcon('Globe', () => (
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <Path d="M2 12h20" />
  </>
));

export const Sparkles = createIcon('Sparkles', () => (
  <>
    <Path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <Path d="M5 3v4" />
    <Path d="M19 17v4" />
    <Path d="M3 5h4" />
    <Path d="M17 19h4" />
  </>
));

export const RefreshCw = createIcon('RefreshCw', () => (
  <>
    <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <Path d="M21 3v5h-5" />
    <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <Path d="M8 16H3v5" />
  </>
));

export const ShieldCheck = createIcon('ShieldCheck', () => (
  <>
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <Path d="m9 12 2 2 4-4" />
  </>
));

export const MessageSquare = createIcon('MessageSquare', () => (
  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
));

export const LogOut = createIcon('LogOut', () => (
  <>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" x2="9" y1="12" y2="12" />
  </>
));

export const Trash2 = createIcon('Trash2', () => (
  <>
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <Line x1="10" x2="10" y1="11" y2="17" />
    <Line x1="14" x2="14" y1="11" y2="17" />
  </>
));

export const Lock = createIcon('Lock', () => (
  <>
    <Rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
));

export const Eye = createIcon('Eye', () => (
  <>
    <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <Circle cx="12" cy="12" r="3" />
  </>
));

export const EyeOff = createIcon('EyeOff', () => (
  <>
    <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <Line x1="2" x2="22" y1="2" y2="22" />
  </>
));

export const KeyRound = createIcon('KeyRound', () => (
  <>
    <Path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <Circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </>
));

export const Mail = createIcon('Mail', () => (
  <>
    <Rect width="20" height="16" x="2" y="4" rx="2" />
    <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>
));

export const WifiOff = createIcon('WifiOff', () => (
  <>
    <Line x1="2" x2="22" y1="2" y2="22" />
    <Path d="M12 20h.01" />
    <Path d="M8.5 16.429a5 5 0 0 1 7 0" />
    <Path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
    <Path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
    <Path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
    <Path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
  </>
));

export const Clock = createIcon('Clock', () => (
  <>
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </>
));

export const Filter = createIcon('Filter', () => (
  <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
));

export const HelpCircle = createIcon('HelpCircle', () => (
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <Path d="M12 17h.01" />
  </>
));

export default {
  ArrowLeft,
  ArrowRight,
  Settings,
  Home,
  Receipt,
  Plus,
  Minus,
  Package,
  BarChart3,
  Zap,
  IndianRupee,
  CheckCircle2,
  Check,
  AlertCircle,
  AlertTriangle,
  PackagePlus,
  Users,
  User,
  ArrowUpDown,
  TrendingUp,
  Search,
  X,
  FolderOpen,
  Share2,
  Printer,
  Tag,
  ChevronDown,
  ChevronRight,
  Boxes,
  Pencil,
  Banknote,
  QrCode,
  CreditCard,
  BookOpen,
  Split,
  Utensils,
  ShoppingCart,
  Cake,
  Coffee,
  Shirt,
  Store,
  ShoppingBag,
  Building2,
  Camera,
  FileText,
  Download,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  LogOut,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  WifiOff,
  Clock,
  Filter,
  HelpCircle,
};
