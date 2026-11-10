import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
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
  const { language, setLanguage } = useAuthStore();
  const { business } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  return (
    <Surface style={styles.header} elevation={2}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
            {title || business?.name || t.appName}
          </Text>
          {subtitle || business?.businessType ? (
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
              {subtitle || business?.ownerName || t.tagline}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langPill}>
            <Text style={styles.langText}>{language === 'en' ? 'தமிழ்' : 'ENG'}</Text>
          </TouchableOpacity>

          {showSettings ? (
            <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.iconBtn}>
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Surface>
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
  langPill: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ROUNDNESS.full,
  },
  langText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
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

