import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Switch, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { BusinessType } from '../types';

const BUSINESS_TYPES: { type: BusinessType; labelEn: string; labelTa: string; icon: string }[] = [
  { type: 'restaurant', labelEn: 'Restaurant / Cafe', labelTa: 'உணவகம்', icon: '🍽️' },
  { type: 'grocery', labelEn: 'Grocery / Kirana', labelTa: 'மளிகை கடை', icon: '🛒' },
  { type: 'bakery', labelEn: 'Bakery & Sweets', labelTa: 'பேக்கரி / இனிப்பகம்', icon: '🧁' },
  { type: 'tea_shop', labelEn: 'Tea / Snack Stall', labelTa: 'தேனீர் கடை', icon: '☕' },
  { type: 'clothing', labelEn: 'Clothing / Textiles', labelTa: 'ஜவுளி கடை', icon: '👕' },
  { type: 'supermarket', labelEn: 'Supermarket', labelTa: 'சூப்பர் மார்க்கெட்', icon: '🏬' },
  { type: 'retail', labelEn: 'General Retail', labelTa: 'சில்லறை கடை', icon: '🛍️' },
  { type: 'other', labelEn: 'Other Retail Store', labelTa: 'பிற கடைகள்', icon: '🏪' },
];

export default function BusinessSetupScreen() {
  const router = useRouter();
  const { user, profile, language } = useAuthStore();
  const { setBusiness } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('grocery');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstin, setGstin] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState('5');
  const [invoicePrefix, setInvoicePrefix] = useState('QB');
  const [isLoading, setIsLoading] = useState(false);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker cancelled or error:', e);
    }
  };

  const handleCompleteSetup = async () => {
    if (!businessName.trim()) {
      Alert.alert(t.error, 'Please enter your business or shop name.');
      return;
    }
    if (!ownerName.trim()) {
      Alert.alert(t.error, 'Please enter the owner name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t.error, 'Please enter a shop contact phone number.');
      return;
    }
    if (!address.trim()) {
      Alert.alert(t.error, 'Please enter your shop address.');
      return;
    }
    if (isGstRegistered && (!gstin || gstin.trim().length !== 15)) {
      Alert.alert(t.error, 'Please enter a valid 15-character GSTIN number.');
      return;
    }

    setIsLoading(true);
    try {
      const ownerId = user?.id || profile?.id || 'usr-demo-001';
      const res = await businessService.createBusiness(ownerId, {
        name: businessName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        businessType,
        logoUrl: logoUri || undefined,
        isGstRegistered,
        gstin: isGstRegistered ? gstin.trim().toUpperCase() : undefined,
        currency: 'INR',
        taxInclusive,
        defaultTaxRate: Number(defaultTaxRate) || 0,
        invoicePrefix: invoicePrefix.trim().toUpperCase() || 'QB',
      });

      if (res.error) {
        Alert.alert(t.error, res.error);
        setIsLoading(false);
        return;
      }

      if (res.business) {
        setBusiness(res.business);
        Alert.alert(t.success, 'Business profile registered successfully!', [
          { text: 'Launch Billing', onPress: () => router.replace('/(tabs)' as any) },
        ]);
      }
    } catch (err: any) {
      Alert.alert(t.error, err.message || 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t.businessSetupTitle}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t.businessSetupSubtitle}
        </Text>
      </View>

      {/* Logo Picker */}
      <View style={styles.logoRow}>
        <TouchableOpacity onPress={handlePickLogo} style={styles.logoPicker}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImage} />
          ) : (
            <View style={styles.placeholderLogo}>
              <Text style={styles.logoCameraIcon}>📷</Text>
              <Text style={styles.logoUploadText}>Upload Logo</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.logoInstructions}>
          <Text style={styles.logoTitle}>Shop Logo / Stamp</Text>
          <Text style={styles.logoDesc}>Appears on printed receipts and WhatsApp PDFs.</Text>
        </View>
      </View>

      {/* Business Details Surface */}
      <Surface style={styles.card} elevation={1}>
        <TextInput
          label={t.businessName + ' *'}
          placeholder="e.g. Sri Lakshmi Kirana & General Store"
          value={businessName}
          onChangeText={setBusinessName}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
        />

        <TextInput
          label={t.ownerName + ' *'}
          placeholder="e.g. S. Ramanathan"
          value={ownerName}
          onChangeText={setOwnerName}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
        />

        <TextInput
          label={t.phone + ' *'}
          placeholder="10-digit shop phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
        />

        <TextInput
          label={t.email}
          placeholder="shop@gmail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
        />

        <TextInput
          label={t.shopAddress + ' *'}
          placeholder="Building No, Street, City, Pincode"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
        />
      </Surface>

      {/* Business Type Grid */}
      <Text style={styles.sectionHeader}>{t.businessType}</Text>
      <View style={styles.typeGrid}>
        {BUSINESS_TYPES.map((item) => {
          const isSelected = businessType === item.type;
          return (
            <TouchableOpacity
              key={item.type}
              onPress={() => setBusinessType(item.type)}
              style={[styles.typeTile, isSelected && styles.selectedTypeTile]}
            >
              <Text style={styles.typeIcon}>{item.icon}</Text>
              <Text
                style={[styles.typeLabel, isSelected && styles.selectedTypeLabel]}
                numberOfLines={1}
              >
                {language === 'ta' ? item.labelTa : item.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* GST & Tax Configuration Surface */}
      <Text style={styles.sectionHeader}>Tax & Invoicing Setup</Text>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>{t.gstRegistered}</Text>
            <Text style={styles.switchSubtitle}>Enable if you possess an official GSTIN.</Text>
          </View>
          <Switch
            value={isGstRegistered}
            onValueChange={setIsGstRegistered}
            color={COLORS.secondary}
          />
        </View>

        {isGstRegistered ? (
          <TextInput
            label={t.gstin}
            placeholder="33AAAAA0000A1Z5"
            value={gstin}
            onChangeText={(txt) => setGstin(txt.toUpperCase())}
            maxLength={15}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.secondary}
            style={styles.input}
          />
        ) : null}

        <View style={[styles.switchRow, { marginTop: SPACING.md }]}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>{t.taxInclusivePrices}</Text>
            <Text style={styles.switchSubtitle}>Prices on shelf already include GST.</Text>
          </View>
          <Switch
            value={taxInclusive}
            onValueChange={setTaxInclusive}
            color={COLORS.secondary}
          />
        </View>

        <View style={styles.twoCol}>
          <TextInput
            label={t.defaultTaxRate}
            placeholder="5"
            value={defaultTaxRate}
            onChangeText={setDefaultTaxRate}
            keyboardType="numeric"
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={[styles.input, styles.halfInput]}
          />

          <TextInput
            label={t.invoicePrefix}
            placeholder="QB"
            value={invoicePrefix}
            onChangeText={(txt) => setInvoicePrefix(txt.toUpperCase())}
            maxLength={6}
            mode="outlined"
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
            style={[styles.input, styles.halfInput]}
          />
        </View>
      </Surface>

      {/* Submit Button */}
      <Button
        mode="contained"
        buttonColor={COLORS.primary}
        textColor={COLORS.white}
        loading={isLoading}
        disabled={isLoading}
        style={styles.submitBtn}
        contentStyle={styles.btnContent}
        onPress={handleCompleteSetup}
      >
        {t.completeSetup}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.base,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoPicker: {
    width: 68,
    height: 68,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    alignItems: 'center',
  },
  logoCameraIcon: {
    fontSize: 20,
  },
  logoUploadText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 2,
  },
  logoInstructions: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  logoTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  logoDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  typeTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  selectedTypeTile: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E6F8FA',
  },
  typeIcon: {
    fontSize: 20,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectedTypeLabel: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  switchSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  twoCol: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  submitBtn: {
    marginTop: SPACING.md,
    borderRadius: ROUNDNESS.md,
  },
  btnContent: {
    paddingVertical: 8,
  },
});

