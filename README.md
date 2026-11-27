# QuickBill – Mobile Billing Application

QuickBill is a production-quality mobile point-of-sale and retail billing application backed by Supabase PostgreSQL, engineered for small business owners in India (kiranas, restaurants, bakeries, tea shops, supermarkets, and apparel stores).

---

## Key Features

1. **Authentication & Multi-Role Staff:**
   - Supabase Auth with Phone OTP and Email/Password.
   - Three-tier RBAC: **owner**, **admin**, and **staff** (view-only POS).
   - Staff accounts created server-side via a dedicated Edge Function so the owner session is never interrupted.
   - Role enforced in three layers: Postgres RLS, service layer (`can()` checks), and UI (`useCan()` hook with `<Redirect />` guards).

2. **Shop Registration & Multi-Business Setup:**
   - Setup shop name, owner contact, shop logo upload, and business type.
   - GSTIN configuration (tax-inclusive or exclusive pricing, default GST rate).
   - Safe sequential invoice prefix formatting (e.g., `QB-2627-0001`).

3. **High-Speed 3-Tap Billing (Create Bill):**
   - Instant product catalog search with category tabs and debounced input (250 ms).
   - Quick + / - item quantity steppers.
   - Custom walk-in items addition.
   - Customer selection and customer ledger tracking.
   - Percentage and fixed rupee discounts (hidden for staff role).
   - Automatic CGST, SGST, and IGST tax calculation with Hamilton remainder redistribution ensuring `sum(lineDiscounts) === billDiscount` to the paise.

4. **Atomic Supabase Cloud Billing:**
   - `create_invoice_atomic` RPC persists invoices, items, customer balances, and stock updates atomically.
   - Idempotent `local_id` tokens prevent duplicate invoices across retries.
   - Deadlock-safe: row locks acquired in deterministic `ORDER BY product_id` order.
   - Stock quantity is clamped to 0 on over-sale; every clamp is logged in `stock_movements` and `audit_logs`.

5. **Payment Processing & Settle:**
   - Cash (real-time change calculation with denomination tender chips).
   - UPI QR scan with reference / UTR entry.
   - Card tap / swipe with auth reference.
   - Udhar / Credit management (outstanding balance added to customer ledger).
   - Split payments (Cash + UPI in configurable proportions).
   - Full Udhar settlement via `settle_customer_udhar` RPC – atomically lowers balance, inserts a `payments` row, and writes to `audit_logs`.

6. **Professional PDF Receipts & Printing:**
   - ESC/POS Thermal receipt template (58 mm / 80 mm wireless printers).
   - Standard A4 Tax Invoice with complete GST breakdown.
   - Direct Bluetooth printing via `expo-print` and one-tap WhatsApp sharing via `expo-sharing`.
   - All user-entered fields are HTML-escaped before interpolation into receipt HTML.

7. **Inventory & Stock Tracking:**
   - Real-time stock decrement on invoice completion.
   - Low-stock alert indicators on the dashboard.
   - Stock in (purchase), stock out (returns / damage), and manual adjustment logs.
   - `adjust_stock` RPC uses `SELECT … FOR UPDATE` to prevent race conditions on concurrent sales.

8. **Reports & Analytics:**
   - Daily, weekly, monthly, and all-time revenue breakdowns.
   - Pre-aggregated `reports_daily_sales` Postgres view for instant multi-day summaries without full invoice downloads.
   - Payment method distribution (Cash / UPI / Card / Udhar) sourced from real `payments` rows.
   - Interactive sales trend bar chart with memoised report computation.

9. **Subscription Engine:**
   - Free Plan vs Pro Business Plan comparison.
   - Monthly (₹299/mo) and Yearly (₹2,499/yr) plans with server-side validation.

---

## Project Architecture

```
QuickBill/
├── __tests__/
│   ├── billingCalculator.test.ts   # Unit + 500-cart property tests (95%+ coverage)
│   ├── billStore.test.ts           # Cart store (100% coverage)
│   ├── reportService.test.ts       # Walk-in normalisation, payment split
│   ├── pdfAndHtml.test.ts          # HTML escaping, receipt generation
│   ├── services.test.ts            # Billing, product, business services
│   ├── authAndStaffServices.test.ts
│   ├── section1Regressions.test.ts
│   └── securityAndPermissions.test.ts
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
│   │   ├── bills.tsx               # Paginated invoice history (cursor pagination)
│   │   ├── index.tsx               # Home dashboard & memoised metrics
│   │   ├── new-bill.tsx            # Fast billing & FlatList POS
│   │   ├── products.tsx            # Product management (owner/admin only)
│   │   └── reports.tsx             # Reports & bar charts
│   ├── _layout.tsx                 # Root layout & Supabase session bootstrap
│   ├── bill-review.tsx             # Bill review & GST breakdown
│   ├── business-setup.tsx          # Shop profile & GST configuration
│   ├── customers.tsx               # Customer list & Udhar ledger
│   ├── index.tsx                   # Splash screen
│   ├── manage-staff.tsx            # Staff management (owner/admin only)
│   ├── payment.tsx                 # Payment settle & Cash/UPI/Split
│   ├── receipt-preview.tsx         # PDF receipt (Thermal & A4)
│   ├── settings.tsx                # Shop settings & printer
│   └── subscription.tsx            # Free vs Pro upgrade (owner only)
├── components/
│   └── common/
│       ├── Header.tsx              # Top app bar
│       ├── QuickBillLogo.tsx       # Brand vector logo
│       ├── SalesBarChart.tsx       # Revenue trend chart
│       ├── SyncStatusBadge.tsx     # Cloud sync indicator
│       └── StatCard.tsx            # Metric cards
├── constants/
│   ├── theme.ts                    # Colours & spacing
│   └── translations.ts             # Centralised UI text
├── services/
│   ├── auth.service.ts             # Supabase Auth & sessions
│   ├── billing.service.ts          # Invoice CRUD, cursor pagination, 23505 retry
│   ├── business.service.ts         # Shop profile, subscriptions, one-time membership sync
│   ├── pdf.service.ts              # expo-print, expo-sharing, HTML escaping
│   ├── product.service.ts          # Products, categories, adjust_stock RPC
│   ├── report.service.ts           # Analytics, reports_daily_sales view, role guard
│   ├── sessionGuard.ts             # Idle session timeout helper
│   ├── staff.service.ts            # Staff list & Edge Function bridge
│   └── supabase.ts                 # Supabase JS client
├── store/
│   ├── auth.store.ts               # Auth & language state
│   ├── bill.store.ts               # Active billing cart (immutable updates, memoised calc)
│   ├── business.store.ts           # Active shop state & role
│   └── product.store.ts            # Product catalog & precomputed search index
├── supabase/
│   ├── functions/
│   │   └── create-staff/           # Edge Function – creates staff auth account server-side
│   ├── migrations/
│   │   ├── 20261110000001_initial_schema.sql      # 12-table schema, RLS, create_invoice_atomic
│   │   ├── 20261126000001_fix_business_members_rls.sql
│   │   ├── 20261126000002_staff_permissions.sql   # Role-scoped RLS for products, invoices, payments
│   │   └── 20261126000003_performance.sql         # Indexes, adjust_stock, settle_customer_udhar, daily view
│   └── tests/
│       └── rls_and_rpcs.test.sql   # Rollback-wrapped SQL assertions for RLS isolation & RPCs
├── types/
│   └── index.ts                    # TypeScript domain models
└── utils/
    ├── billingCalculator.ts        # GST math, paise rounding, normalizeQuantity
    ├── html.ts                     # escapeHtml() for safe receipt interpolation
    ├── navigation.ts               # Typed route helpers
    ├── permissions.ts              # can() / ROLE_PERMISSIONS matrix
    └── useDebouncedValue.ts        # 250 ms debounce hook
```

---

## Role & Permission Matrix

| Permission | staff | admin | owner |
|---|:---:|:---:|:---:|
| Create bill (POS, cart, checkout, receipt) | ✓ | ✓ | ✓ |
| View products (read-only, search, add to cart) | ✓ | ✓ | ✓ |
| Add customer (during billing) | ✓ | ✓ | ✓ |
| View own bill history | ✓ | ✓ | ✓ |
| View all invoices | — | ✓ | ✓ |
| Manage products (add / edit / delete) | — | ✓ | ✓ |
| Adjust stock | — | ✓ | ✓ |
| View reports / dashboard totals | — | ✓ | ✓ |
| Void invoice | — | ✓ | ✓ |
| Settle Udhar / edit customers | — | ✓ | ✓ |
| Manage staff | — | ✓ | ✓ |
| Manage settings (business profile, GST) | — | — | ✓ |
| Manage subscription / upgrade | — | — | ✓ |

> Staff may not apply discounts or see `purchase_price_paise` (cost price) anywhere in the UI.

---

## Supabase Setup & Database Migrations

1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Run all migrations in order via the Supabase CLI:

```bash
npx supabase db push
```

Or manually paste each file from `supabase/migrations/` into the SQL Editor in chronological order.

The migrations create all 12 tables (`profiles`, `businesses`, `business_members`, `categories`, `products`, `customers`, `invoices`, `invoice_items`, `payments`, `stock_movements`, `subscriptions`, `audit_logs`), Row Level Security policies, performance indexes, and stored procedures.

3. Deploy the staff-creation Edge Function:

```bash
npx supabase functions deploy create-staff
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
# Optional legacy JWT anon key fallback
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Running the Application

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start

# Run on Android
npm run android
```

---

## Development Scripts

```bash
npm run typecheck   # tsc --noEmit (zero TypeScript errors required)
npm run lint        # expo lint via ESLint flat config (eslint-config-expo ~58)
npm run test        # jest (watch mode)
npm run test:ci     # jest --ci --coverage (CI mode)
npm run verify      # typecheck && lint && test:ci (full gate)
```

> `npm run verify` must exit 0 before merging any PR.

---

## Running Tests

```bash
npm run test:ci
```

8 test suites, 63 tests covering:

| Target | Line Coverage |
|---|---|
| `utils/billingCalculator.ts` | 95.12% |
| `store/bill.store.ts` | 100% |
| `utils/html.ts` | 100% |
| `services/` aggregate | 80.66% |
| All files aggregate | 80.4% |

Includes a 500-random-cart property test (`billingCalculator.test.ts`) that verifies the invariant `sum(lineDiscounts) === billDiscount` for every random cart permutation.

The SQL test suite (`supabase/tests/rls_and_rpcs.test.sql`) runs against a live Supabase project:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_rpcs.test.sql
```

---

## Local JS Benchmarks (Node, in-process)

Measured on the development machine using `ts-jest` transpilation — not a physical device or live Postgres:

| Benchmark | Result |
|---|---|
| `addToCart` × 50 items | 0.75 ms |
| `getCalculation()` × 1,000 calls (memoised, cache hit) | 0.25 ms |
| `calculateBill()` × 1,000 calls (unmemoised baseline) | 20.76 ms |
| `generateReport` on 2,000 synthetic invoices (monthly) | 115.6 ms |
| `fetchReportForPeriod` aggregating 30 pre-aggregated view rows | 6.5 ms |

Memoisation provides an **83× speedup** for repeated dashboard renders. The daily-sales view provides an **~18× speedup** over full-invoice aggregation at 2,000-invoice scale.

---

## expo-doctor Status

`npx expo-doctor` reports 18/20 checks passed. Two known issues (not blocking development):

1. **Missing peer dependency**: `expo-font` (required by `@expo/vector-icons`) — install with `npx expo install expo-font`.
2. **8 SDK 58 patch version mismatches** (`expo`, `expo-constants`, `expo-file-system`, `expo-linking`, `expo-print`, `expo-router`, `expo-sharing`, `expo-status-bar`) — resolve with `npx expo install --fix`.

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| All money stored in integer paise | Eliminates floating-point rounding errors in tax and discount calculations |
| Hamilton remainder redistribution for discounts | Guarantees `sum(lineDiscounts) === billDiscount` to the paise, preventing GST mismatches |
| `create_invoice_atomic` SECURITY DEFINER RPC | Single round-trip, deadlock-safe row locking, stock clamped at 0, idempotent via `local_id` |
| `reports_daily_sales` Postgres view | Multi-day analytics without downloading thousands of invoice rows to the client |
| Staff accounts via Edge Function | Owner session is never replaced when creating staff; uses Supabase Admin API server-side |
| `(SELECT auth.uid())` in RLS policies | Prevents repeated per-row function calls (InitPlan optimisation), significant on large tables |
| Zustand selectors + `useShallow` | Prevents unnecessary re-renders when only unrelated slice of store changes |
| Cursor pagination on `created_at` | Avoids `OFFSET` scan degradation on large invoice tables; list screens fetch `withItems: false` |
