# QuickBill Staff & Owner RBAC Acceptance Test Checklist

Run these manual & API verification tests against your Supabase project after applying migration `20261126000002_staff_permissions.sql` and deploying the `create-staff` Edge Function.

## Preconditions
- Owner account registered with an active business.
- Supabase migrations applied up to `20261126000002_staff_permissions.sql`.
- Edge Function `create-staff` deployed (`supabase functions deploy create-staff`).

---

## 1. Staff Creation & Login Flow
- [ ] Upgrade shop subscription to **Starter** (`max_staff = 2`) or **Pro** (`max_staff = 5`), or temporarily test Free plan limit first (see Test 8).
- [ ] Owner navigates to **Dashboard -> Staff** (or **Settings -> Staff Management**).
- [ ] Tap **Add Staff**, enter full name, 10-digit mobile number, and password (>= 6 chars), then submit.
- [ ] Confirm the owner remains logged in as Owner on the owner device (session did NOT switch).
- [ ] On a second device / fresh session, log in with the staff member's 10-digit mobile number and password.
- [ ] Verify staff lands directly on the **New Bill (POS)** screen (`/(tabs)/new-bill`), not Dashboard or Business Setup.

## 2. UI Tab Isolation & Deep-Link Route Guards
- [ ] Verify the staff bottom tab bar shows **ONLY** `My Bills`, `New Bill`, and `Products` (no `Home` or `Reports`).
- [ ] Verify header shows the **Staff Cashier** profile pill (name, phone, shop, role, **Sign Out**) and hides the **Settings** gear button.
- [ ] Verify on **New Bill**: `+ Custom` item button and `Add Discount` trigger are hidden; inter-state toggle/cart/customer selector work normally.
- [ ] Verify on **Products**: `Add`, `Edit`, `Adjust Stock`, and all cost prices (`purchase_price_paise`) are hidden.
- [ ] Verify on **My Bills**: Void button is hidden.
- [ ] Open owner-only routes directly via deep link while logged in as staff:
  - `/settings` -> redirects to `/(tabs)/new-bill`
  - `/subscription` -> redirects to `/(tabs)/new-bill`
  - `/manage-staff` -> redirects to `/(tabs)/new-bill`
  - `/customers` -> redirects to `/(tabs)/new-bill`
  - `/(tabs)/reports` -> redirects to `/(tabs)/new-bill`
  - `/(tabs)` (Dashboard) -> redirects to `/(tabs)/new-bill`

## 3. End-to-End Staff Billing Flow
- [ ] On POS (`/(tabs)/new-bill`), add 2 products to cart and adjust quantities.
- [ ] Open customer modal, create or select a customer, and proceed to Review -> Payment.
- [ ] Complete Cash or UPI payment.
- [ ] Confirm receipt preview opens and PDF shares/prints cleanly.
- [ ] Confirm product stock quantity decremented in Supabase `products` and logged in `stock_movements`.
- [ ] Open **My Bills** tab and confirm the new invoice appears.

## 4. Direct Database / API Security Enforcement (Staff JWT)
Using the staff user's access token (`Authorization: Bearer <STAFF_JWT>`) against PostgREST/Supabase API:
- [ ] `UPDATE products SET selling_price_paise = 100 WHERE id = '<id>'` -> fails / updates 0 rows (RLS).
- [ ] `DELETE FROM products WHERE id = '<id>'` -> fails / deletes 0 rows (RLS).
- [ ] `UPDATE invoices SET is_void = true WHERE id = '<id>'` -> fails / updates 0 rows (RLS).
- [ ] `UPDATE customers SET outstanding_balance_paise = 0 WHERE id = '<id>'` -> fails / updates 0 rows (RLS).
- [ ] `INSERT INTO payments (...)` directly -> fails with RLS violation (`42501`).
- [ ] `SELECT * FROM invoices` -> returns **only** rows where `created_by = <staff_user_id>`; owner/other-staff invoices return empty.
- [ ] `SELECT * FROM products_staff_view` -> returns products without `purchase_price_paise`.

## 5. Cross-Business RPC Isolation (`create_invoice_atomic`)
- [ ] With a valid JWT from Business A (owner or staff), call `POST /rest/v1/rpc/create_invoice_atomic` passing `p_business_id = <BUSINESS_B_UUID>`.
- [ ] Confirm Postgres raises exception: `Not permitted: user is not an active member of this business`.
- [ ] Confirm Business B invoices and stock levels remain untouched.

## 6. Suspended Staff Enforcement
- [ ] While staff is logged in, owner taps **Suspend** on that staff member in **Manage Staff**.
- [ ] When staff logs out and tries to log back in, verify login is blocked with `"Your staff account has been suspended by the shop owner."`
- [ ] When already logged in and suspended, trigger an invoice creation or product reload; verify the app detects the non-active membership, forces logout, clears local stores, and shows `"Access Revoked"`.

## 7. Owner Team Management Actions
- [ ] Owner opens **Manage Staff** and sees all team members with name, mobile number, role badge, and `ACTIVE`/`SUSPENDED` status.
- [ ] Owner taps **Suspend**, confirms status changes to `SUSPENDED`.
- [ ] Owner taps **Activate**, confirms status changes back to `ACTIVE` (respecting `max_staff`).
- [ ] Owner taps **Reset Password**, sets a new password (>= 6 chars), and staff logs in with the new password.
- [ ] Owner taps **Remove** (or tries adding a duplicate mobile number or owner's number) and verifies friendly validation/error handling.

## 8. Plan Staff Limit & Free Plan Upgrade Prompt
- [ ] On **Free Plan** (`max_staff = 1`), open **Manage Staff**.
- [ ] Verify banner displays `"1 of 1 seat used"` (owner occupies 1 seat) and displays the **Upgrade** prompt card.
- [ ] Tapping **Add Staff** prompts to upgrade to Starter/Pro (`View Plans -> /subscription`).
- [ ] Direct call to `create-staff` Edge Function at or above `max_staff` returns HTTP `403` with `"Staff limit reached. Upgrade your plan."`.
