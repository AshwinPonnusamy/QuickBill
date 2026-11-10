import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { TRANSLATIONS } from '../../constants/translations';
import { SupportedLanguage } from '../../types';

export default function RegisterScreen() {
  const router = useRouter();
  const { language, setAuth, setLanguage } = useAuthStore();
  const t = TRANSLATIONS[language];

  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert(t.error, 'Please enter your full name.');
      return;
    }
    if (!identifier.trim()) {
      Alert.alert(t.error, 'Please enter your phone number or email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.error, 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.error, 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      setLanguage(selectedLang);
      const res = await authService.signUp(identifier, password, fullName, selectedLang);
      if (res.error) {
        Alert.alert(t.error, res.error);
        setIsLoading(false);
        return;
      }

      setAuth(res.user, res.profile);
      router.replace('/business-setup' as any);
    } catch (err: any) {
      Alert.alert(t.error, err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerArea}>
          <Text variant="headlineMedium" style={styles.title}>
            {t.register}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Create your account to start managing retail bills effortlessly
          </Text>
        </View>

        {/* Form Card */}
        <Surface style={styles.formCard} elevation={2}>
          <TextInput
            label={t.fullName}
            placeholder="e.g. R. Murugan"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Text>👤</Text>} />}
          />

          <TextInput
            label={t.phone}
            placeholder={t.phonePlaceholder}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Text>📱</Text>} />}
          />

          <TextInput
            label={t.password}
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Text>🔒</Text>} />}
          />

          <TextInput
            label="Confirm Password"
            placeholder="Re-type your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Text>🔐</Text>} />}
          />

          {/* Language selector chips */}
          <Text style={styles.langLabel}>App Interface Language:</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              onPress={() => setSelectedLang('en')}
              style={[styles.langChip, selectedLang === 'en' && styles.activeChip]}
            >
              <Text style={[styles.langChipText, selectedLang === 'en' && styles.activeChipText]}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedLang('ta')}
              style={[styles.langChip, selectedLang === 'ta' && styles.activeChip]}
            >
              <Text style={[styles.langChipText, selectedLang === 'ta' && styles.activeChipText]}>
                தமிழ் (Tamil)
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="contained"
            buttonColor={COLORS.secondary}
            textColor={COLORS.white}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
            contentStyle={styles.btnContent}
            onPress={handleRegister}
          >
            {t.continue} to Business Setup →
          </Button>
        </Surface>

        {/* Switch to Login */}
        <View style={styles.bottomLinkContainer}>
          <Text style={styles.normalText}>{t.alreadyHaveAccount} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.boldLink}>{t.login}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: SPACING.base,
    paddingTop: 50,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  langLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  langRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  langChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  activeChip: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E6F8FA',
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeChipText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: SPACING.sm,
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 6,
  },
  bottomLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  normalText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  boldLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

