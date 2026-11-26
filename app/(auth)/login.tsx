import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Card, Input } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { authService } from '../../services/auth.service';
import { businessService } from '../../services/business.service';
import { productService } from '../../services/product.service';
import { useProductStore } from '../../store/product.store';
import { can } from '../../utils/permissions';
import { TRANSLATIONS } from '../../constants/translations';
import { Receipt, Phone, Lock, Eye, EyeOff } from '../../components/common/Icons';
import { QuickBillLogo } from '../../components/common/QuickBillLogo';

export default function LoginScreen() {
  const router = useRouter();
  const { language, setAuth, logout } = useAuthStore();
  const { setBusiness, setRole, setSubscription, resetBusinessSession } = useBusinessStore();
  const { setProducts, setCategories } = useProductStore();
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

      // Check if user has business setup or suspended staff membership
      const biz = await businessService.getBusiness(res.user.id);
      if (!biz) {
        const suspended = await businessService.isUserSuspended(res.user.id);
        if (suspended) {
          await authService.signOut();
          logout();
          resetBusinessSession();
          Alert.alert(
            'Account Suspended',
            'Your staff account has been suspended by the shop owner. Contact your shop owner for access.'
          );
          return;
        }
        router.replace('/business-setup' as any);
        return;
      }

      if (biz.ownerId !== res.user.id) {
        const status = await businessService.getMembershipStatus(biz.id, res.user.id);
        if (status !== 'active') {
          await authService.signOut();
          logout();
          resetBusinessSession();
          Alert.alert('Access Denied', 'Your staff membership is no longer active.');
          return;
        }
      }

      const role = await businessService.getMyRole(biz.id, res.user.id);
      setBusiness(biz);
      setRole(role);

      const [sub, prods, cats] = await Promise.all([
        businessService.getSubscription(biz.id),
        productService.getProducts(biz.id),
        productService.getCategories(biz.id),
      ]);
      setSubscription(sub);
      setProducts(prods);
      setCategories(cats);

      if (can(role, 'view_reports')) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/(tabs)/new-bill' as any);
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
            <QuickBillLogo size={68} />
          </View>
          <Text style={styles.title}>
            {t.login}
          </Text>
          <Text style={styles.subtitle}>
            Enter your credentials to access your billing account
          </Text>
        </View>

        {/* Input Form Card */}
        <Card radius="xl" shadow="md" style={styles.formCard}>
          <Input
            label="Email or Phone Number"
            placeholder="Enter email or 10-digit mobile number"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            startContent={<Phone size={18} color={COLORS.textMuted} />}
          />

          <Input
            label={t.password}
            placeholder={t.passwordPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            startContent={<Lock size={18} color={COLORS.textMuted} />}
            endContent={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
              </TouchableOpacity>
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
            color="primary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isLoading}
            style={styles.submitBtn}
            onPress={handleLogin}
          >
            {t.login}
          </Button>
        </Card>

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
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: SPACING.lg,
    fontSize: 14,
  },
  formCard: {
    padding: SPACING.lg,
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


