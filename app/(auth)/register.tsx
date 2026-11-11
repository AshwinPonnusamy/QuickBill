import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Card, Input } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { TRANSLATIONS } from '../../constants/translations';
import { User, Phone, Lock, KeyRound } from '../../components/common/Icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { language, setAuth } = useAuthStore();
  const t = TRANSLATIONS[language];

  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      const res = await authService.signUp(identifier, password, fullName, 'en');
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
          <Text style={styles.title}>
            {t.register}
          </Text>
          <Text style={styles.subtitle}>
            Create your account to start managing retail bills effortlessly
          </Text>
        </View>

        {/* Form Card */}
        <Card radius="xl" shadow="md" style={styles.formCard}>
          <Input
            label={t.fullName}
            placeholder="e.g. R. Murugan"
            value={fullName}
            onChangeText={setFullName}
            startContent={<User size={18} color="#71717A" />}
          />

          <Input
            label={t.phone}
            placeholder={t.phonePlaceholder}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            startContent={<Phone size={18} color="#71717A" />}
          />

          <Input
            label={t.password}
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            startContent={<Lock size={18} color="#71717A" />}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-type your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            startContent={<KeyRound size={18} color="#71717A" />}
          />

          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isLoading}
            style={styles.submitBtn}
            onPress={handleRegister}
          >
            {t.continue} to Business Setup →
          </Button>
        </Card>

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
    marginTop: SPACING.md,
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


