import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Text } from 'react-native';
import { Button, Card, Input, Switch } from '../components/heroui';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useShallow } from 'zustand/react/shallow';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { businessService } from '../services/business.service';
import { TRANSLATIONS } from '../constants/translations';
import { BusinessType } from '../types';
import {
  Utensils,
  ShoppingCart,
  Cake,
  Coffee,
  Shirt,
  Store,
  ShoppingBag,
  Building2,
  Camera,
} from '../components/common/Icons';
import { QuickBillLogo } from '../components/common/QuickBillLogo';

const BUSINESS_TYPES: { type: BusinessType; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { type: 'restaurant', label: 'Restaurant / Cafe', Icon: Utensils },
  { type: 'grocery', label: 'Grocery / Kirana', Icon: ShoppingCart },
  { type: 'bakery', label: 'Bakery & Sweets', Icon: Cake },
  { type: 'tea_shop', label: 'Tea / Snack Stall', Icon: Coffee },
  { type: 'clothing', label: 'Clothing / Textiles', Icon: Shirt },
  { type: 'supermarket', label: 'Supermarket', Icon: Store },
  { type: 'retail', label: 'General Retail', Icon: ShoppingBag },
  { type: 'other', label: 'Other Retail Store', Icon: Building2 },
];

export default function BusinessSetupScreen() {
  const router = useRouter();
  const { user, profile, language } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      profile: s.profile,
      language: s.language,
    }))
  );
  const { setBusiness, setRole } = useBusinessStore(
    useShallow((s) => ({
      setBusiness: s.setBusiness,
      setRole: s.setRole,
    }))
  );
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
        base64: false,
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

    const ownerId = user?.id || profile?.id;
    if (!ownerId) {
      Alert.alert(t.error, 'Please sign in before registering your shop.');
      router.replace('/(auth)/login' as any);
      return;
    }

    setIsLoading(true);
    try {
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
        setRole('owner');
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
        <View style={styles.brandRow}>
          <QuickBillLogo size={38} showWordmark wordmarkSize={20} />
        </View>
        <Text style={styles.title}>
          {t.businessSetupTitle}
        </Text>
        <Text style={styles.subtitle}>
          {t.businessSetupSubtitle}
        </Text>
      </View>

      {/* Logo Picker */}
      <Card radius="lg" shadow="sm" style={styles.logoRow}>
        <TouchableOpacity onPress={handlePickLogo} style={styles.logoPicker}>
          {logoUri ? (
            <Image source={{ uri: logoUri, cache: 'force-cache' }} style={styles.logoImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderLogo}>
              <Camera size={26} color={COLORS.secondary} style={{ marginBottom: 4 }} />
              <Text style={styles.logoUploadText}>Upload Logo</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.logoInstructions}>
          <Text style={styles.logoTitle}>Shop Logo / Stamp</Text>
          <Text style={styles.logoDesc}>Appears on printed receipts and WhatsApp PDFs.</Text>
        </View>
      </Card>

      {/* Business Details Surface */}
      <Card radius="xl" shadow="sm" style={styles.card}>
        <Input
          label={t.businessName + ' *'}
          placeholder="e.g. Sri Lakshmi Kirana & General Store"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <Input
          label={t.ownerName + ' *'}
          placeholder="e.g. S. Ramanathan"
          value={ownerName}
          onChangeText={setOwnerName}
        />

        <Input
          label={t.phone + ' *'}
          placeholder="10-digit shop phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label={t.email}
          placeholder="shop@gmail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Input
          label={t.shopAddress + ' *'}
          placeholder="Building No, Street, City, Pincode"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
        />
      </Card>

      {/* Business Type Grid */}
      <Text style={styles.sectionHeader}>{t.businessType}</Text>
      <View style={styles.typeGrid}>
        {BUSINESS_TYPES.map((item) => {
          const isSelected = businessType === item.type;
          const IconComp = item.Icon;
          return (
            <Card
              key={item.type}
              isPressable
              radius="md"
              shadow="sm"
              onPress={() => setBusinessType(item.type)}
              style={[styles.typeTile, isSelected && styles.selectedTypeTile]}
            >
              <View style={[styles.typeIconWrapper, isSelected && styles.selectedTypeIconWrapper]}>
                <IconComp size={22} color={isSelected ? COLORS.white : COLORS.primary} />
              </View>
              <Text
                style={[styles.typeLabel, isSelected && styles.selectedTypeLabel]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Card>
          );
        })}
      </View>

      {/* GST & Tax Configuration Surface */}
      <Text style={styles.sectionHeader}>Tax & Invoicing Setup</Text>
      <Card radius="xl" shadow="sm" style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>{t.gstRegistered}</Text>
            <Text style={styles.switchSubtitle}>Enable if you possess an official GSTIN.</Text>
          </View>
          <Switch
            isSelected={isGstRegistered}
            onValueChange={setIsGstRegistered}
            color="secondary"
          />
        </View>

        {isGstRegistered ? (
          <Input
            label={t.gstin}
            placeholder="33AAAAA0000A1Z5"
            value={gstin}
            onChangeText={(txt) => setGstin(txt.toUpperCase())}
            maxLength={15}
          />
        ) : null}

        <View style={[styles.switchRow, { marginTop: SPACING.md }]}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchTitle}>{t.taxInclusivePrices}</Text>
            <Text style={styles.switchSubtitle}>Prices on shelf already include GST.</Text>
          </View>
          <Switch
            isSelected={taxInclusive}
            onValueChange={setTaxInclusive}
            color="secondary"
          />
        </View>

        <View style={styles.twoCol}>
          <Input
            label={t.defaultTaxRate}
            placeholder="5"
            value={defaultTaxRate}
            onChangeText={setDefaultTaxRate}
            keyboardType="numeric"
            style={styles.halfInput}
          />

          <Input
            label={t.invoicePrefix}
            placeholder="QB"
            value={invoicePrefix}
            onChangeText={(txt) => setInvoicePrefix(txt.toUpperCase())}
            maxLength={6}
            style={styles.halfInput}
          />
        </View>
      </Card>

      {/* Submit Button */}
      <Button
        color="primary"
        size="lg"
        radius="md"
        fullWidth
        isLoading={isLoading}
        style={styles.submitBtn}
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
  brandRow: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
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
    padding: SPACING.base,
    marginBottom: SPACING.lg,
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
    gap: SPACING.sm,
  },
  selectedTypeTile: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondaryContainer,
  },
  typeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTypeIconWrapper: {
    backgroundColor: COLORS.secondary,
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
    marginBottom: SPACING.md,
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
  },
});
