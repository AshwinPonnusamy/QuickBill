import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        App Language
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        QuickBill operates in English for Indian retail billing
      </Text>

      <View style={styles.optionsContainer}>
        <Surface style={[styles.card, styles.selectedCard]} elevation={2}>
          <View style={styles.flagIcon}>
            <Text style={styles.flagEmoji}>🇮🇳</Text>
          </View>
          <View style={styles.textContainer}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              English
            </Text>
            <Text variant="bodySmall" style={styles.cardSub}>
              Standard retail business language
            </Text>
          </View>
          <Text style={styles.checkIcon}>✅</Text>
        </Surface>

        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          textColor={COLORS.white}
          style={styles.btn}
          onPress={() => router.back()}
        >
          Confirm
        </Button>
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
    gap: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  selectedCard: {
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
  btn: {
    borderRadius: ROUNDNESS.md,
    marginTop: SPACING.md,
  },
});
