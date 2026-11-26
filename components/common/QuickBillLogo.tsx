import React, { useId } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
} from 'react-native-svg';
import { COLORS } from '../../constants/theme';

interface QuickBillLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
  lightText?: boolean;
}

/**
 * Custom vector brand logo for QuickBill.
 * Combines a crisp receipt silhouette with an electric lightning bolt on an indigo squircle.
 */
export const QuickBillLogo: React.FC<QuickBillLogoProps> = ({
  size = 80,
  showWordmark = false,
  wordmarkSize = 22,
  lightText = false,
}) => {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const badgeGradId = `qbBadge-${rawId}`;
  const zapGradId = `qbZap-${rawId}`;
  const paperGradId = `qbPaper-${rawId}`;
  const tealGradId = `qbTeal-${rawId}`;
  const glowGradId = `qbGlow-${rawId}`;

  const icon = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={badgeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6366F1" />
            <Stop offset="55%" stopColor="#4F46E5" />
            <Stop offset="100%" stopColor="#3730A3" />
          </LinearGradient>

          <LinearGradient id={zapGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FDE047" />
            <Stop offset="60%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          <LinearGradient id={paperGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F1F5F9" />
          </LinearGradient>

          <LinearGradient id={tealGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#2DD4BF" />
            <Stop offset="100%" stopColor="#0D9488" />
          </LinearGradient>

          <RadialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
            <Stop offset="60%" stopColor="#818CF8" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient Outer Glow */}
        <Circle cx="50" cy="50" r="48" fill={`url(#${glowGradId})`} />

        {/* Outer Squircle Badge */}
        <Rect x="8" y="8" width="84" height="84" rx="24" fill={`url(#${badgeGradId})`} />

        {/* Subtle Inner Border Highlight */}
        <Rect
          x="9.5"
          y="9.5"
          width="81"
          height="81"
          rx="22.5"
          stroke="#FFFFFF"
          strokeOpacity="0.24"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Receipt Silhouette */}
        <Path
          d="M 27 24
             L 73 24
             A 4 4 0 0 1 77 28
             L 77 73
             L 71 68.5
             L 65 73
             L 59 68.5
             L 53 73
             L 47 68.5
             L 41 73
             L 35 68.5
             L 29 73
             L 23 68.5
             L 23 28
             A 4 4 0 0 1 27 24 Z"
          fill={`url(#${paperGradId})`}
        />

        {/* Receipt Header Teal Bar */}
        <Path
          d="M 23 28
             A 4 4 0 0 1 27 24
             L 73 24
             A 4 4 0 0 1 77 28
             L 77 33.5
             L 23 33.5 Z"
          fill={`url(#${tealGradId})`}
        />

        {/* Receipt Line Items */}
        <Rect x="29" y="39.5" width="22" height="3.2" rx="1.6" fill="#94A3B8" opacity="0.65" />
        <Rect x="56" y="39.5" width="15" height="3.2" rx="1.6" fill="#64748B" opacity="0.85" />

        <Rect x="29" y="46.5" width="18" height="3.2" rx="1.6" fill="#94A3B8" opacity="0.65" />
        <Rect x="52" y="46.5" width="19" height="3.2" rx="1.6" fill="#64748B" opacity="0.85" />

        <Rect x="29" y="53.5" width="24" height="3.2" rx="1.6" fill="#94A3B8" opacity="0.65" />
        <Rect x="58" y="53.5" width="13" height="3.2" rx="1.6" fill="#64748B" opacity="0.85" />

        {/* Perforation Line */}
        <Path d="M 28 61 L 72 61" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="2,2" />

        {/* Lightning Bolt Drop Shadow */}
        <Path
          d="M 57 22 L 42 46 L 53 46 L 41 78 L 69 49 L 56 49 Z"
          fill="#000000"
          opacity="0.18"
          transform="translate(1, 1.5)"
        />

        {/* Dynamic Lightning Bolt */}
        <Path
          d="M 57 22 L 42 46 L 53 46 L 41 78 L 69 49 L 56 49 Z"
          fill={`url(#${zapGradId})`}
        />

        {/* Lightning Sheen */}
        <Path
          d="M 55 25 L 45 44 L 54 44 L 46 69 L 65 50 L 55 50 Z"
          fill="#FFFBEB"
          opacity="0.45"
        />

        {/* Accent Sparkles */}
        <Circle cx="76.5" cy="21.5" r="2.2" fill="#FDE047" opacity="0.9" />
        <Circle cx="20.5" cy="74.5" r="1.8" fill="#2DD4BF" opacity="0.9" />
      </Svg>
    </View>
  );

  if (!showWordmark) {
    return icon;
  }

  return (
    <View style={styles.wordmarkRow}>
      {icon}
      <Text
        style={[
          styles.wordmarkText,
          { fontSize: wordmarkSize, color: lightText ? COLORS.white : COLORS.primary },
        ]}
      >
        Quick
        <Text style={{ color: lightText ? COLORS.secondaryLight : COLORS.secondary }}>Bill</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmarkText: {
    fontWeight: '900',
    letterSpacing: -0.4,
  },
});
