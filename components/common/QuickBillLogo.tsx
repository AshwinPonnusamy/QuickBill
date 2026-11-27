import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface QuickBillLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
  lightText?: boolean;
}

const LOGO_SOURCE = require('../../assets/quickbill-logo.webp');

/**
 * Brand logo component for QuickBill using the official QuickBill mark.
 */
export const QuickBillLogo: React.FC<QuickBillLogoProps> = ({
  size = 80,
  showWordmark = false,
  wordmarkSize = 22,
  lightText = false,
}) => {
  const icon = (
    <View
      style={[
        styles.iconWrapper,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
        },
      ]}
    >
      <Image
        source={LOGO_SOURCE}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24),
        }}
        resizeMode="contain"
      />
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
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
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
