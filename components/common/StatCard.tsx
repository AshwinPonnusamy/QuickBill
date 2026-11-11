import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { COLORS, ROUNDNESS, SPACING } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  color = COLORS.primary,
  bgColor = COLORS.surface,
}) => {
  return (
    <Surface style={[styles.card, { backgroundColor: bgColor }]} elevation={1}>
      <View style={styles.topRow}>
        <Text variant="labelMedium" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      </View>
      <Text variant="headlineSmall" style={[styles.value, { color }]}>
        {value}
      </Text>
      {subValue ? (
        <Text variant="bodySmall" style={styles.subValue}>
          {subValue}
        </Text>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: '700',
    fontSize: 20,
    marginTop: 2,
  },
  subValue: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});

