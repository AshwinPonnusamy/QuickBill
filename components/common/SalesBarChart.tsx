import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { COLORS, ROUNDNESS, SPACING } from '../../constants/theme';
import { formatRupees } from '../../utils/billingCalculator';

interface BarData {
  label: string;
  value: number; // in rupees
}

interface SalesBarChartProps {
  data: BarData[];
  height?: number;
}

export const SalesBarChart: React.FC<SalesBarChartProps> = ({
  data,
  height = 180,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.noDataText}>No sales recorded for this period</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 100);

  return (
    <View style={[styles.container, { height }]}>
      {/* Bars container */}
      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const ratio = Math.min(1, Math.max(0.06, item.value / maxValue));
          const barHeight = Math.round((height - 50) * ratio);
          const isHighest = item.value === maxValue && item.value > 0;

          return (
            <View key={index} style={styles.barColumn}>
              {/* Value on top of bar */}
              <Text style={[styles.valueLabel, isHighest && styles.highestLabel]} numberOfLines={1}>
                {item.value >= 1000 ? `₹${(item.value / 1000).toFixed(1)}k` : item.value > 0 ? `₹${item.value}` : '0'}
              </Text>

              {/* Bar track */}
              <View style={styles.trackArea}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: isHighest ? COLORS.secondary : COLORS.primaryLight,
                    },
                  ]}
                />
              </View>

              {/* X-axis Day Label */}
              <Text style={[styles.dayLabel, isHighest && styles.highestDayLabel]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Baseline */}
      <View style={styles.baseline} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: SPACING.sm,
    justifyContent: 'flex-end',
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 3,
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  highestLabel: {
    color: COLORS.secondary,
    fontWeight: '900',
  },
  trackArea: {
    width: '100%',
    maxWidth: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: ROUNDNESS.sm,
  },
  barFill: {
    width: '100%',
    borderRadius: ROUNDNESS.sm,
    minHeight: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  highestDayLabel: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  baseline: {
    height: 1.5,
    backgroundColor: COLORS.border,
    width: '100%',
    marginTop: 4,
  },
  noDataText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});

