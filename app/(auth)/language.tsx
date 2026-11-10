import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { SupportedLanguage } from '../../types';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useAuthStore();

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Choose Your Language
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        மொழியைத் தேர்ந்தெடுக்கவும்
      </Text>

      <View style={styles.optionsContainer}>
        {/* English Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectLanguage('en')}
          style={styles.cardWrapper}
        >
          <Surface
            style={[
              styles.card,
              language === 'en' && styles.selectedCard,
            ]}
            elevation={language === 'en' ? 3 : 1}
          >
            <View style={styles.flagIcon}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
            </View>
            <View style={styles.textContainer}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                English
              </Text>
              <Text variant="bodySmall" style={styles.cardSub}>
                Default business language
              </Text>
            </View>
            <Text style={styles.checkIcon}>{language === 'en' ? '✅' : '⚪'}</Text>
          </Surface>
        </TouchableOpacity>

        {/* Tamil Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectLanguage('ta')}
          style={styles.cardWrapper}
        >
          <Surface
            style={[
              styles.card,
              language === 'ta' && styles.selectedCard,
            ]}
            elevation={language === 'ta' ? 3 : 1}
          >
            <View style={styles.flagIcon}>
              <Text style={styles.flagEmoji}>🏛️</Text>
            </View>
            <View style={styles.textContainer}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                தமிழ் (Tamil)
              </Text>
              <Text variant="bodySmall" style={styles.cardSub}>
                தமிழ் வழி எளிய பில்லிங்
              </Text>
            </View>
            <Text style={styles.checkIcon}>{language === 'ta' ? '✅' : '⚪'}</Text>
          </Surface>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SPACING.base,
  },
  title: {
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  selectedCard: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E6F8FA',
  },
  flagIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  flagEmoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSub: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 20,
  },
});

