import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react-native';
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
  let textColor = COLORS.success;
  let label = t.synced;
  let IconComponent = CheckCircle2;

  if (status === 'pending') {
    bg = COLORS.warningLight;
    textColor = COLORS.warning;
    label = t.pendingSync;
    IconComponent = Clock;
  } else if (status === 'failed') {
    bg = COLORS.errorLight;
    textColor = COLORS.error;
    label = t.syncFailed;
    IconComponent = AlertTriangle;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <IconComponent size={12} color={textColor} style={styles.icon} />
      <Text style={[styles.text, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

