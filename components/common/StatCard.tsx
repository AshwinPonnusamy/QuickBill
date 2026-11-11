import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Card } from '../heroui';
import { COLORS, SPACING } from '../../constants/theme';

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
  bgColor,
}) => {
  return (
    <Card
      radius="lg"
      shadow="sm"
      style={[styles.card, bgColor ? { backgroundColor: bgColor } : null]}
    >
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      </View>
      <Text style={[styles.value, { color }]}>
        {value}
      </Text>
      {subValue ? (
        <Text style={styles.subValue}>
          {subValue}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: SPACING.md,
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
    fontWeight: '800',
    fontSize: 20,
    marginTop: 2,
  },
  subValue: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});


