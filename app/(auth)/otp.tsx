import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Card, Input } from '../../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { useBusinessStore } from '../../store/business.store';
import { authService } from '../../services/auth.service';
import { businessService } from '../../services/business.service';
import { TRANSLATIONS } from '../../constants/translations';

export default function OtpScreen() {
  const router = useRouter();
  const { language, setAuth } = useAuthStore();
  const { setBusiness } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert(t.error, 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.sendOtp(phone);
      if (res.error) {
        Alert.alert(t.error, res.error);
      } else {
        setStep('verify');
        Alert.alert(t.success, 'OTP has been sent to your mobile number.');
      }
    } catch (e: any) {
      Alert.alert(t.error, e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert(t.error, 'Please enter the verification code.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.verifyOtp(phone, otp);
      if (res.error) {
        Alert.alert(t.error, res.error);
        setIsLoading(false);
        return;
      }

      setAuth(res.user, res.profile);
      const biz = await businessService.getBusiness(res.user.id);
      if (biz) {
        setBusiness(biz);
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/business-setup' as any);
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
          <Text style={styles.title}>
            {step === 'phone' ? 'Mobile Login' : t.verifyOtp}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Enter your mobile number to receive a secure login code'
              : `Enter the verification code sent to +91 ${phone}`}
          </Text>
        </View>

        <Card radius="xl" shadow="md" style={styles.formCard}>
          {step === 'phone' ? (
            <>
              <Input
                label={t.phone}
                placeholder="10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                startContent={<Text style={styles.affix}>+91</Text>}
              />
              <Button
                color="primary"
                size="lg"
                radius="md"
                fullWidth
                isLoading={isLoading}
                style={styles.submitBtn}
                onPress={handleSendOtp}
              >
                {t.sendOtp}
              </Button>
            </>
          ) : (
            <>
              <Input
                label="Verification Code (OTP)"
                placeholder="e.g. 123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                color="secondary"
                size="lg"
                radius="md"
                fullWidth
                isLoading={isLoading}
                style={styles.submitBtn}
                onPress={handleVerifyOtp}
              >
                {t.verifyOtp} & Enter
              </Button>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.changePhoneBtn}>
                <Text style={styles.changePhoneText}>Change Mobile Number</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Login with Password</Text>
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
  affix: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  changePhoneBtn: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  changePhoneText: {
    color: COLORS.secondary,
    fontWeight: '600',
    fontSize: 13,
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


