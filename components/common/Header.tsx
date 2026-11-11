import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Settings } from './Icons';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { TRANSLATIONS } from '../../constants/translations';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showSettings = true,
}) => {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title || business?.name || t.appName}
          </Text>
          {subtitle || business?.businessType ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle || business?.ownerName || t.tagline}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {showSettings ? (
            <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.iconBtn}>
              <Settings size={20} color={COLORS.white} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: SPACING.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingRight: SPACING.md,
  },
  backText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    padding: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconText: {
    fontSize: 16,
  },
});
