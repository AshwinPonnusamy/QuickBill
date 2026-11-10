import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SyncStatus } from '../../types';
import { COLORS, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';

interface SyncStatusBadgeProps {
  status: SyncStatus;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status }) => {
  const { language } = useAuthStore();
  const t = TRANSLATIONS[language];

  let bg = COLORS.successLight;
  let text = COLORS.success;
  let label = t.synced;
  let icon = '✓';

  if (status === 'pending') {
    bg = COLORS.warningLight;
    text = COLORS.warning;
    label = t.pendingSync;
    icon = '⏳';
  } else if (status === 'failed') {
    bg = COLORS.errorLight;
    text = COLORS.error;
    label = t.syncFailed;
    icon = '⚠️';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>
        {icon} {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

