import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { TRANSLATIONS } from '../../constants/translations';
import { Mail } from '../../components/common/Icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
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
          [{ text: 'OK', onPress: () => router.back() }]
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
          <Text variant="headlineMedium" style={styles.title}>
            {t.forgotPassword}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your registered email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        <Surface style={styles.formCard} elevation={2}>
          <TextInput
            label="Email Address"
            placeholder="shop@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Mail size={18} color={COLORS.textSecondary} />} />}
          />

          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
            contentStyle={styles.btnContent}
            onPress={handleReset}
          >
            Send Recovery Email
          </Button>
        </Surface>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
  title: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.base,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  submitBtn: {
    marginTop: SPACING.sm,
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 6,
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

