import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
  G,
  Mask,
} from 'react-native-svg';
import { COLORS } from '../../constants/theme';

interface QuickBillLogoProps {
  size?: number;
  variant?: 'full' | 'icon-only' | 'monochrome';
}

/**
 * Custom vector brand logo for QuickBill.
 * Combines a sleek receipt/invoice silhouette with an energetic lightning bolt and Rupee symbol.
 */
export const QuickBillLogo: React.FC<QuickBillLogoProps> = ({
  size = 80,
  variant = 'full',
}) => {
  const viewBoxSize = 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <Defs>
          {/* Main Shield / Badge Gradient */}
          <LinearGradient id="qbBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6366F1" />
            <Stop offset="50%" stopColor="#4F46E5" />
            <Stop offset="100%" stopColor="#3730A3" />
          </LinearGradient>

          {/* Electric Lightning & Accent Gradient */}
          <LinearGradient id="qbZapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FDE047" />
            <Stop offset="60%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          {/* Receipt Background Gradient */}
          <LinearGradient id="qbPaperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F1F5F9" />
          </LinearGradient>

          {/* Teal Secondary Gradient for decorative lines */}
          <LinearGradient id="qbTealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#2DD4BF" />
            <Stop offset="100%" stopColor="#0D9488" />
          </LinearGradient>

          {/* Subtle Outer Glow */}
          <RadialGradient id="qbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="60%" stopColor="#818CF8" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient Outer Ring / Glow */}
        <Circle cx="50" cy="50" r="48" fill="url(#qbGlow)" />

        {/* Outer squircle badge */}
        <Rect
          x="8"
          y="8"
          width="84"
          height="84"
          rx="24"
          fill="url(#qbBadgeGrad)"
        />

        {/* Inner subtle border highlight */}
        <Rect
          x="9"
          y="9"
          width="82"
          height="82"
          rx="23"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Receipt Paper Silhouette */}
        {/* Folded / layered receipt card inside */}
        <Path
          d="M 27 25 
             L 73 25 
             A 4 4 0 0 1 77 29 
             L 77 72 
             L 71 68 
             L 65 72 
             L 59 68 
             L 53 72 
             L 47 68 
             L 41 72 
             L 35 68 
             L 29 72 
             L 23 68 
             L 23 29 
             A 4 4 0 0 1 27 25 Z"
          fill="url(#qbPaperGrad)"
        />

        {/* Receipt Header Top Accent Bar */}
        <Path
          d="M 23 29 
             A 4 4 0 0 1 27 25 
             L 73 25 
             A 4 4 0 0 1 77 29 
             L 77 34 
             L 23 34 Z"
          fill="url(#qbTealGrad)"
        />

        {/* Receipt Line Items (representing printed text / bills) */}
        <Rect x="30" y="40" width="22" height="3" rx="1.5" fill="#94A3B8" opacity="0.65" />
        <Rect x="56" y="40" width="14" height="3" rx="1.5" fill="#64748B" opacity="0.85" />

        <Rect x="30" y="47" width="18" height="3" rx="1.5" fill="#94A3B8" opacity="0.65" />
        <Rect x="52" y="47" width="18" height="3" rx="1.5" fill="#64748B" opacity="0.85" />

        <Rect x="30" y="54" width="24" height="3" rx="1.5" fill="#94A3B8" opacity="0.65" />
        <Rect x="58" y="54" width="12" height="3" rx="1.5" fill="#64748B" opacity="0.85" />

        {/* Dotted divider line */}
        <Path
          d="M 28 61 L 72 61"
          stroke="#CBD5E1"
          strokeWidth="1.2"
          strokeDasharray="2,2"
        />

        {/* Floating Dynamic Lightning Bolt ("Quick") overlaid across the receipt */}
        {/* Bolt drop shadow */}
        <Path
          d="M 57 23 L 42 46 L 53 46 L 41 77 L 69 49 L 56 49 Z"
          fill="#000000"
          opacity="0.18"
          transform="translate(1, 1)"
        />

        {/* Dynamic Glowing Lightning Bolt */}
        <Path
          d="M 57 23 L 42 46 L 53 46 L 41 77 L 69 49 L 56 49 Z"
          fill="url(#qbZapGrad)"
        />

        {/* Inner Lightning Sheen */}
        <Path
          d="M 55 26 L 45 44 L 54 44 L 46 68 L 65 50 L 55 50 Z"
          fill="#FFFBEB"
          opacity="0.45"
        />

        {/* Small sparkle dots for polish */}
        <Circle cx="76" cy="22" r="2.2" fill="#FDE047" opacity="0.9" />
        <Circle cx="21" cy="74" r="1.8" fill="#2DD4BF" opacity="0.9" />
      </Svg>
    </View>
  );
};
