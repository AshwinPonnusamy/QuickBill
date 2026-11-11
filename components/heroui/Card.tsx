import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { HERO_COLORS, HERO_RADIUS, HeroRadius } from './theme';

export interface CardProps {
  children?: React.ReactNode;
  isPressable?: boolean;
  onPress?: () => void;
  radius?: HeroRadius;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  elevation?: number; // compatibility with react-native-paper Surface elevation
}

export const Card: React.FC<CardProps> = ({
  children,
  isPressable = false,
  onPress,
  radius = 'lg',
  shadow = 'sm',
  style,
}) => {
  const Container = isPressable ? TouchableOpacity : View;
  const borderRadius = HERO_RADIUS[radius];

  return (
    <Container
      activeOpacity={0.8}
      onPress={isPressable ? onPress : undefined}
      style={[
        styles.card,
        { borderRadius },
        shadow !== 'none' && styles[`shadow_${shadow}`],
        style,
      ]}
    >
      {children}
    </Container>
  );
};

export const CardHeader: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.header, style]}>{children}</View>;

export const CardBody: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.body, style]}>{children}</View>;

export const CardFooter: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.footer, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: HERO_COLORS.content1,
    borderWidth: 1,
    borderColor: HERO_COLORS.defaultBorder,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shadow_sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  shadow_md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  shadow_lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});
