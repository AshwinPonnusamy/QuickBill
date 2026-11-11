import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { authService } from '../../services/auth.service';
import { businessService } from '../../services/business.service';
import { TRANSLATIONS } from '../../constants/translations';
import { Receipt, Phone, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { language, setAuth } = useAuthStore();
  const { setBusiness } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert(t.error, 'Please enter your phone number or email.');
      return;
    }
    if (!password) {
      Alert.alert(t.error, 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signIn(identifier, password);
      if (res.error) {
        Alert.alert(t.error, res.error);
        setIsLoading(false);
        return;
      }

      setAuth(res.user, res.profile);

      // Check if user has business setup
      const biz = await businessService.getBusiness(res.user.id);
      if (biz) {
        setBusiness(biz);
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/business-setup' as any);
      }
    } catch (err: any) {
      Alert.alert(t.error, err.message || 'Login failed');
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
        {/* Brand Banner */}
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Receipt size={32} color={COLORS.secondary} />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            {t.login}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your credentials to access your billing account
          </Text>
        </View>

        {/* Input Form Card */}
        <Surface style={styles.formCard} elevation={2}>
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
            left={<TextInput.Icon icon={() => <Phone size={18} color={COLORS.textSecondary} />} />}
          />

          <TextInput
            label={t.password}
            placeholder={t.passwordPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={styles.input}
            left={<TextInput.Icon icon={() => <Lock size={18} color={COLORS.textSecondary} />} />}
            right={
              <TextInput.Icon
                icon={() => showPassword ? <EyeOff size={18} color={COLORS.textSecondary} /> : <Eye size={18} color={COLORS.textSecondary} />}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <View style={styles.rowBetween}>
            <TouchableOpacity onPress={() => router.push('/(auth)/otp' as any)}>
              <Text style={styles.linkText}>Login with OTP instead</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
              <Text style={styles.linkText}>{t.forgotPassword}</Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="contained"
            buttonColor={COLORS.primary}
            textColor={COLORS.white}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitBtn}
            contentStyle={styles.btnContent}
            onPress={handleLogin}
          >
            {t.login}
          </Button>
        </Surface>

        {/* Switch to Register */}
        <View style={styles.bottomLinkContainer}>
          <Text style={styles.normalText}>{t.dontHaveAccount} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
            <Text style={styles.boldLink}>{t.register}</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.lg,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  linkText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  submitBtn: {
    marginTop: SPACING.lg,
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
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

