import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Card, Input } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { TRANSLATIONS } from '../../constants/translations';
import { safeGoBack } from '../../utils/navigation';
import { Mail } from '../../components/common/Icons';
import { QuickBillLogo } from '../../components/common/QuickBillLogo';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = TRANSLATIONS[language];

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert(t.error, 'Please enter a valid registered email address.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.resetPassword(email);
      if (res.error) {
        Alert.alert(t.error, res.error);
      } else {
        Alert.alert(
          t.success,
          'Password reset link has been sent to your email. Please check your inbox.',
          [{ text: 'OK', onPress: () => safeGoBack(router, '/(auth)/login') }]
        );
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <View style={styles.logoWrapper}>
            <QuickBillLogo size={60} />
          </View>
          <Text style={styles.title}>
            {t.forgotPassword}
          </Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we&apos;ll send you instructions to reset your password.
          </Text>
        </View>

        <Card radius="xl" shadow="md" style={styles.formCard}>
          <Input
            label="Email Address"
            placeholder="shop@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            startContent={<Mail size={18} color="#71717A" />}
          />

          <Button
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isLoading}
            style={styles.submitBtn}
            onPress={handleReset}
          >
            Send Recovery Email
          </Button>
        </Card>

        <TouchableOpacity onPress={() => safeGoBack(router, '/(auth)/login')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoWrapper: {
    marginBottom: SPACING.md,
  },
  title: {
    fontWeight: '800',
    fontSize: 24,
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.base,
    fontSize: 14,
  },
  formCard: {
    padding: SPACING.lg,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});


