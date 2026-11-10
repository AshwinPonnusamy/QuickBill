# QuickBill – Mobile Billing Application

QuickBill is a production-quality, offline-first mobile point-of-sale and retail billing application engineered for small business owners in India (kiranas, restaurants, bakeries, tea shops, supermarkets, and apparel stores).

---

## 🚀 Key Features

1. **Authentication & Multi-Role Staff:**
   - Supabase Auth integration with Phone OTP and Email/Password.
   - Profile management and English / Tamil (தமிழ்) language toggling.
   - Offline fallback mode for zero-latency startup.

2. **Shop Registration & Multi-Business Setup:**
   - Setup shop name, owner contact, shop logo upload, and business type.
   - GSTIN configuration (tax-inclusive or exclusive pricing, default GST rate).
   - Safe sequential invoice prefix formatting (e.g., `QB-2627-0001`).

3. **High-Speed 3-Tap Billing (Create Bill):**
   - Instant product catalog search with category tabs.
   - Quick + / - item quantity steppers.
   - Custom walk-in items addition.
   - Customer selection and customer ledger tracking.
   - Percentage and fixed rupee discounts.
   - Automatic CGST, SGST, and IGST tax calculation.

4. **100% Offline-First SQLite Billing:**
   - Uses `expo-sqlite` to persist invoices, items, customer balances, and stock locally before confirming success.
   - Local sequence counters and idempotent operations prevent duplicate invoices.
   - Background synchronization queue with automatic retry logic upon internet reconnection.

5. **Payment Processing & Settle:**
   - Supports Cash (with real-time change calculation and quick denomination tender chips).
   - UPI QR scan with reference / UTR entry.
   - POS Card tap / swipe with auth reference.
   - Udhar / Credit management (adds to customer outstanding balance).
   - Split payments (e.g. Cash + UPI).

6. **Professional PDF Receipts & Printing:**
   - ESC/POS Thermal receipt template (58mm / 80mm wireless printers).
   - Standard A4 Tax Invoice template with complete GST breakdown.
   - Direct Bluetooth printing via `expo-print` and one-tap WhatsApp sharing via `expo-sharing`.

7. **Inventory & Stock Tracking:**
   - Real-time stock decrement on invoice completion.
   - Low-stock alert indicators on dashboard.
   - Stock in (purchase), stock out (returns/damage), and manual adjustment logs.

8. **Reports & Analytics:**
   - Daily, weekly, monthly, and all-time revenue breakdowns.
   - Strict separation between gross revenue and wholesale profits.
   - Payment method distributions (Cash vs UPI vs Card vs Udhar).
   - Interactive sales trend bar chart using `react-native-gifted-charts`.

9. **Subscription Engine:**
   - Free Plan vs Pro Business Plan comparison.
   - Monthly (₹299/mo) and Yearly (₹2,499/yr) plans with server-side validation.

---

## 📁 Project Architecture

```
QuickBill/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── forgot-password.tsx
│   │   ├── language.tsx
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   ├── otp.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── bills.tsx             # Bill History & Invoices
│   │   ├── index.tsx             # Home Dashboard & Metrics
│   │   ├── new-bill.tsx          # Fast Billing & Cart
│   │   ├── products.tsx          # Product Management
│   │   └── reports.tsx           # Reports & Charts
│   ├── _layout.tsx               # Root Layout & SQLite bootstrap
│   ├── bill-review.tsx           # Bill Review & GST breakdown
│   ├── business-setup.tsx        # Shop profile & GST configuration
│   ├── customers.tsx             # Customer List & Udhar Ledger
│   ├── index.tsx                 # Splash screen
│   ├── inventory.tsx             # Stock movement & history
│   ├── payment.tsx               # Payment settle & Cash/UPI/Split
│   ├── receipt-preview.tsx       # PDF Receipt (Thermal & A4)
│   ├── settings.tsx              # Shop settings, backup, printer
│   └── subscription.tsx          # Free vs Pro upgrade screen
├── components/
│   └── common/
│       ├── Header.tsx            # Top App Bar with Tamil switch
│       ├── StatCard.tsx          # Metric cards
│       └── SyncStatusBadge.tsx   # Synced / Pending / Failed pills
├── constants/
│   ├── theme.ts                  # Material 3 colors & spacing
│   └── translations.ts           # English & Tamil translations
├── database/
│   └── sqlite.ts                 # Local offline SQLite database
├── services/
│   ├── auth.service.ts           # Supabase Auth & sessions
│   ├── billing.service.ts        # Invoice creation & atomicity
│   ├── business.service.ts       # Shop profile & subscriptions
│   ├── pdf.service.ts            # expo-print & expo-sharing
│   ├── product.service.ts        # Products & categories
│   ├── report.service.ts         # Analytics & aggregations
│   ├── supabase.ts               # Supabase JS client
│   └── sync.service.ts           # Offline sync queue worker
├── store/
│   ├── auth.store.ts             # Auth & language state
│   ├── bill.store.ts             # Active billing cart state
│   ├── business.store.ts         # Active shop state
│   └── product.store.ts          # Product catalog state
├── supabase/
│   └── migrations/
│       └── 20261110000001_initial_schema.sql  # Full 12-table PostgreSQL schema & RLS
├── types/
│   └── index.ts                  # TypeScript domain models
└── utils/
    └── billingCalculator.ts      # GST math & paise calculations
```

---

## 🛠️ Supabase Setup & Database Migrations

1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of [`supabase/migrations/20261110000001_initial_schema.sql`](supabase/migrations/20261110000001_initial_schema.sql).
4. Run the query. It creates all 12 tables (`profiles`, `businesses`, `business_members`, `categories`, `products`, `customers`, `invoices`, `invoice_items`, `payments`, `stock_movements`, `subscriptions`, `audit_logs`), Row Level Security policies, indexes, and the atomic `create_invoice_atomic` stored procedure.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*Note: QuickBill includes an automatic local fallback mode, allowing you to run, test, and generate receipts immediately even without active Supabase credentials.*

---

## 🏃 Running the Application

Start the Expo development server:

```bash
npm start
```

Run on Android emulator or physical device via Expo Go:

```bash
npm run android
```

Run unit test suites:

```bash
npm test
```

