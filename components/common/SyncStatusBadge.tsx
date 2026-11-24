import React from 'react';
import { Badge, HeroColor } from '../heroui';
import { CheckCircle2, Clock, AlertTriangle } from './Icons';
import { SyncStatus } from '../../types';
import { COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { TRANSLATIONS } from '../../constants/translations';

interface SyncStatusBadgeProps {
  status: SyncStatus;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status }) => {
  const { language } = useAuthStore();
  const t = TRANSLATIONS[language];

  let color: HeroColor = 'success';
  let label = t.synced;
  let IconComponent = CheckCircle2;

  if (status === 'pending') {
    color = 'warning';
    label = t.pendingSync;
    IconComponent = Clock;
  } else if (status === 'failed') {
    color = 'danger';
    label = t.syncFailed;
    IconComponent = AlertTriangle;
  }

  return (
    <Badge
      color={color}
      variant="flat"
      size="sm"
      radius="full"
      startContent={<IconComponent size={12} color={color === 'success' ? COLORS.success : color === 'warning' ? COLORS.warning : COLORS.error} />}
    >
      {label}
    </Badge>
  );
};


