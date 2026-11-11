import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { HERO_COLORS, HERO_RADIUS, HeroRadius } from './theme';

export interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  errorMessage?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  variant?: 'flat' | 'bordered' | 'faded';
  radius?: HeroRadius;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  left?: React.ReactNode; // compatibility with react-native-paper TextInput left
  right?: React.ReactNode; // compatibility with react-native-paper TextInput right
  mode?: string;
  outlineColor?: string;
  activeOutlineColor?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  errorMessage,
  isInvalid = false,
  isDisabled = false,
  variant = 'bordered',
  radius = 'md',
  startContent,
  endContent,
  style,
  inputStyle,
  left,
  right,
  secureTextEntry,
  keyboardType,
  multiline,
  numberOfLines,
  autoCapitalize,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderRadius = HERO_RADIUS[radius];
  const hasError = isInvalid || !!errorMessage;

  let bg = HERO_COLORS.content1;
  let borderColor = HERO_COLORS.defaultBorder;
  let borderWidth = 1.5;

  if (variant === 'flat') {
    bg = HERO_COLORS.defaultLight;
    borderWidth = 0;
  } else if (variant === 'faded') {
    bg = HERO_COLORS.defaultLight;
    borderColor = HERO_COLORS.defaultBorder;
    borderWidth = 1;
  }

  if (isFocused) {
    borderColor = HERO_COLORS.secondary;
    borderWidth = 1.5;
  }

  if (hasError) {
    borderColor = HERO_COLORS.danger;
  }

  const prefix = startContent || left;
  const suffix = endContent || right;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            borderColor,
            borderWidth,
            borderRadius,
            minHeight: multiline && numberOfLines ? numberOfLines * 24 : 44,
          },
          isDisabled && styles.disabled,
        ]}
      >
        {prefix ? <View style={styles.startContent}>{prefix}</View> : null}

        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A1A1AA"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          editable={!isDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, inputStyle]}
          {...props}
        />

        {suffix ? <View style={styles.endContent}>{suffix}</View> : null}
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: HERO_COLORS.foreground,
    marginBottom: 6,
  },
  labelError: {
    color: HERO_COLORS.danger,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: HERO_COLORS.foreground,
    paddingVertical: 8,
  },
  startContent: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endContent: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 11,
    color: HERO_COLORS.danger,
    marginTop: 4,
    fontWeight: '500',
  },
});
