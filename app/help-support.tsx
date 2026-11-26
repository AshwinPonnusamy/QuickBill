import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Text } from 'react-native';
import { Button, Card, Input, Divider, Badge } from '../components/heroui';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, ROUNDNESS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { TRANSLATIONS } from '../constants/translations';
import {
  Phone,
  Mail,
  ChevronDown,
  Sparkles,
} from '../components/common/Icons';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Where is my billing data stored?',
    a: 'QuickBill securely stores all your products, invoices, payments, and customer records in your Supabase PostgreSQL cloud database with Row-Level Security so your data stays up to date across sessions.',
  },
  {
    q: 'Can I connect a Bluetooth thermal printer?',
    a: 'Yes! QuickBill is compatible with standard 58mm and 80mm wireless ESC/POS Bluetooth and USB thermal printers.',
  },
  {
    q: 'How do I print or share an invoice PDF?',
    a: 'Once a bill is settled, you can tap Print or Share from the receipt preview screen to instantly output thermal receipts or share digital copies.',
  },
  {
    q: 'How does Customer Udhar (Credit) ledger work?',
    a: 'When billing an unpaid or credit order, select a registered customer and choose "Udhar / Credit" on the payment screen. The balance will automatically update in their customer ledger.',
  },
  {
    q: 'Are my business and tax records secure?',
    a: 'Yes. QuickBill uses bank-grade encrypted database isolation with Row-Level Security (RLS) on PostgreSQL so only your authenticated merchant account can access your store data.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { language } = useAuthStore();
  const { business, subscription } = useBusinessStore();
  const t = TRANSLATIONS[language];

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';

  const handleCallSupport = () => {
    Linking.openURL('tel:+919840000000').catch(() => {
      Alert.alert('Helpline', 'Call us directly at +91 98400 00000 (Mon-Sat, 9 AM - 9 PM IST)');
    });
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(`Support Request - ${business?.name || 'QuickBill Shop'}`);
    Linking.openURL(`mailto:support@quickbill.in?subject=${subject}`).catch(() => {
      Alert.alert('Email Support', 'Please email us at support@quickbill.in');
    });
  };

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert(t.error, 'Please enter both a subject and a description for your issue.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSubject('');
      setTicketMessage('');
      Alert.alert(
        t.success,
        'Support ticket created successfully! Our merchant assistance team will contact you within 2 hours.'
      );
    }, 600);
  };

  return (
    <View style={styles.container}>
      <Header title="Help & Support" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Support Priority Banner */}
        <Card radius="xl" shadow="md" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>QuickBill Merchant Support</Text>
              <Text style={styles.heroSub}>We are here to help your retail shop grow</Text>
            </View>
            <Badge
              color={isPro ? 'secondary' : 'default'}
              variant="solid"
              size="sm"
              startContent={<Sparkles size={11} color={COLORS.white} />}
            >
              {isPro ? '24/7 Priority Support' : 'Standard Support'}
            </Badge>
          </View>

          {/* Quick Contact Action Buttons */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCallSupport}
              style={[styles.contactTile, { backgroundColor: COLORS.primaryContainer }]}
            >
              <Phone size={20} color={COLORS.primary} />
              <Text style={[styles.contactTileText, { color: COLORS.primary }]}>Phone Call Helpline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleEmailSupport}
              style={[styles.contactTile, { backgroundColor: COLORS.surfaceVariant }]}
            >
              <Mail size={20} color={COLORS.secondary} />
              <Text style={[styles.contactTileText, { color: COLORS.secondary }]}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Section: Frequently Asked Questions */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions (FAQ)</Text>
        <Card radius="xl" shadow="sm" style={styles.faqCard}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <View key={index}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedFaq(isExpanded ? null : index)}
                  style={styles.faqHeader}
                >
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <ChevronDown
                    size={16}
                    color={COLORS.textSecondary}
                    style={{
                      transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}

                {index < FAQS.length - 1 && <Divider style={styles.faqDivider} />}
              </View>
            );
          })}
        </Card>

        {/* Section: Send a Support Message */}
        <Text style={styles.sectionTitle}>Submit a Support Request</Text>
        <Card radius="xl" shadow="sm" style={styles.formCard}>
          <Input
            label="Subject"
            placeholder="e.g. Printer setup issue, GST question"
            value={ticketSubject}
            onChangeText={setTicketSubject}
          />

          <Input
            label="Describe Your Issue"
            placeholder="Please detail what happened or what you need help with..."
            value={ticketMessage}
            onChangeText={setTicketMessage}
            multiline
            numberOfLines={4}
          />

          <Button
            color="secondary"
            size="lg"
            radius="md"
            fullWidth
            isLoading={isSubmitting}
            onPress={handleSubmitTicket}
            style={{ marginTop: SPACING.xs }}
          >
            Submit Request
          </Button>
        </Card>

        {/* Support Hours Card */}
        <View style={styles.hoursNotice}>
          <Text style={styles.hoursTitle}>Support Hours</Text>
          <Text style={styles.hoursText}>Monday to Saturday: 9:00 AM – 9:00 PM IST</Text>
          <Text style={styles.hoursText}>Merchant Support Helpline: +91 98400 00000</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  heroGreeting: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  heroSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  contactTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: ROUNDNESS.md,
    gap: 4,
  },
  contactTileText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  faqCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  faqBody: {
    paddingBottom: 12,
    paddingTop: 2,
  },
  faqAnswer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  faqDivider: {
    backgroundColor: COLORS.border,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hoursNotice: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  hoursTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  hoursText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});

