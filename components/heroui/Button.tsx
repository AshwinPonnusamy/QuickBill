import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { HERO_COLORS, HERO_RADIUS, HeroColor, HeroVariant, HeroSize, HeroRadius } from './theme';

export interface ButtonProps {
  children?: React.ReactNode;
  color?: HeroColor;
  variant?: HeroVariant;
  size?: HeroSize;
  radius?: HeroRadius;
  isLoading?: boolean;
  isDisabled?: boolean;
  disabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isIconOnly?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  mode?: string; // compatibility with react-native-paper Button mode
  buttonColor?: string;
  textColor?: string;
  compact?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  color = 'primary',
  variant = 'solid',
  size = 'md',
  radius = 'md',
  isLoading = false,
  isDisabled = false,
  disabled = false,
  startContent,
  endContent,
  isIconOnly = false,
  fullWidth = false,
  onPress,
  style,
  textStyle,
  buttonColor,
  textColor,
  compact = false,
}) => {
  const activeDisabled = isDisabled || disabled || isLoading;

  // Compute background and text color
  let bg = HERO_COLORS[color] || HERO_COLORS.primary;
  let fg = HERO_COLORS.primaryForeground;
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (buttonColor) {
    bg = buttonColor;
  }

  if (variant === 'solid') {
    // defaults
  } else if (variant === 'bordered') {
    bg = 'transparent';
    borderColor = buttonColor || HERO_COLORS[color];
    borderWidth = 1.5;
    fg = buttonColor || HERO_COLORS[color];
  } else if (variant === 'flat') {
    const lightKey = `${color}Light` as keyof typeof HERO_COLORS;
    bg = HERO_COLORS[lightKey] || HERO_COLORS.defaultLight;
    fg = HERO_COLORS[color] || HERO_COLORS.primary;
  } else if (variant === 'faded') {
    bg = HERO_COLORS.defaultLight;
    borderColor = HERO_COLORS.defaultBorder;
    borderWidth = 1;
    fg = HERO_COLORS[color];
  } else if (variant === 'light') {
    bg = 'transparent';
    fg = buttonColor || HERO_COLORS[color];
  } else if (variant === 'shadow') {
    // Solid + shadow elevation
  }

  if (textColor) {
    fg = textColor;
  }

  // Size specifications
  let height = 44;
  let px = 16;
  let fontSize = 14;

  if (size === 'sm' || compact) {
    height = 36;
    px = 12;
    fontSize = 12;
  } else if (size === 'lg') {
    height = 52;
    px = 24;
    fontSize = 16;
  }

  if (isIconOnly) {
    px = 0;
  }

  const borderRadius = HERO_RADIUS[radius];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={activeDisabled}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          height,
          paddingHorizontal: px,
          borderRadius,
          borderColor,
          borderWidth,
          opacity: activeDisabled ? 0.55 : 1,
          width: fullWidth ? '100%' : isIconOnly ? height : undefined,
        },
        variant === 'shadow' && styles.shadow,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={fg} style={{ marginRight: children ? 8 : 0 }} />
      ) : startContent ? (
        <View style={styles.startContent}>{startContent}</View>
      ) : null}

      {children ? (
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            {
              color: fg,
              fontSize,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : null}

      {endContent && !isLoading ? (
        <View style={styles.endContent}>{endContent}</View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  startContent: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endContent: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
