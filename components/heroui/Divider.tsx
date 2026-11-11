import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { HERO_COLORS } from './theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  style,
}) => {
  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
    backgroundColor: HERO_COLORS.defaultBorder,
  },
  vertical: {
    width: 1,
    height: '100%',
    backgroundColor: HERO_COLORS.defaultBorder,
  },
});
