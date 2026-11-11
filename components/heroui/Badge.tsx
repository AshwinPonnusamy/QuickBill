import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { HERO_COLORS, HERO_RADIUS, HeroColor, HeroRadius } from './theme';

export interface BadgeProps {
  children?: React.ReactNode;
  color?: HeroColor;
  variant?: 'solid' | 'flat' | 'bordered' | 'dot';
  size?: 'sm' | 'md' | 'lg';
  radius?: HeroRadius;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  startContent?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'primary',
  variant = 'flat',
  size = 'md',
  radius = 'full',
  style,
  textStyle,
  startContent,
}) => {
  let bg = HERO_COLORS[color];
  let fg = HERO_COLORS.primaryForeground;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'flat') {
    const lightKey = `${color}Light` as keyof typeof HERO_COLORS;
    bg = HERO_COLORS[lightKey] || HERO_COLORS.defaultLight;
    fg = HERO_COLORS[color];
  } else if (variant === 'bordered') {
    bg = 'transparent';
    borderColor = HERO_COLORS[color];
    borderWidth = 1;
    fg = HERO_COLORS[color];
  }

  let py = 3;
  let px = 8;
  let fontSize = 11;

  if (size === 'sm') {
    py = 2;
    px = 6;
    fontSize = 10;
  } else if (size === 'lg') {
    py = 5;
    px = 12;
    fontSize = 13;
  }

  const borderRadius = HERO_RADIUS[radius];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: py,
          paddingHorizontal: px,
          borderRadius,
          borderColor,
          borderWidth,
        },
        style,
      ]}
    >
      {variant === 'dot' ? (
        <View style={[styles.dot, { backgroundColor: HERO_COLORS[color] }]} />
      ) : null}

      {startContent ? (
        <View style={styles.startContent}>{startContent}</View>
      ) : null}

      {children ? (
        <Text style={[styles.text, { color: fg, fontSize }, textStyle]}>
          {children}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  startContent: {
    marginRight: 4,
  },
});

