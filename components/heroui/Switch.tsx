import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps } from 'react-native';
import { HERO_COLORS, HeroColor } from './theme';

export interface SwitchProps extends RNSwitchProps {
  color?: HeroColor;
  isSelected?: boolean;
  onValueChange?: (value: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({
  color = 'secondary',
  value,
  isSelected,
  onValueChange,
  ...props
}) => {
  const activeColor = HERO_COLORS[color];
  const currentValue = isSelected !== undefined ? isSelected : !!value;

  return (
    <RNSwitch
      value={currentValue}
      onValueChange={onValueChange}
      trackColor={{
        false: '#D4D4D8',
        true: activeColor,
      }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#D4D4D8"
      {...props}
    />
  );
};

