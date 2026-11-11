import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Card, Button } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../constants/theme';
import { Globe, CheckCircle2 } from '../../components/common/Icons';

export default function LanguageScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        App Language
      </Text>
      <Text style={styles.subtitle}>
        QuickBill operates in English for Indian retail billing
      </Text>

      <View style={styles.optionsContainer}>
        <Card radius="lg" shadow="sm" style={[styles.card, styles.selectedCard]}>
          <View style={styles.flagIcon}>
            <Globe size={22} color={COLORS.secondary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>
              English
            </Text>
            <Text style={styles.cardSub}>
              Standard retail business language
            </Text>
          </View>
          <CheckCircle2 size={20} color={COLORS.success} />
        </Card>

        <Button
          color="primary"
          size="lg"
          radius="md"
          fullWidth
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
    fontSize: 24,
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.xl,
    fontSize: 14,
  },
  optionsContainer: {
    gap: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
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
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  cardSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  btn: {
    marginTop: SPACING.md,
  },
});

