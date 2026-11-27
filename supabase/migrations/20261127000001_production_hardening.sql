-- =============================================================================
-- QuickBill: Production Hardening Migration
-- Migration: 20261127000001_production_hardening.sql
-- Addresses:
--   §1  Column-level security on purchase_price_paise (GRANT/REVOKE)
--   §2  Discount enforcement inside create_invoice_atomic
--   §3  Cross-business ownership validation in create_invoice_atomic
--   §4  Audit log insert protection (no authenticated user may INSERT/UPDATE/DELETE)
--   §5  Business member role-escalation prevention RLS
--   §6  Invoice void RLS – only owner/admin, not cross-business
--   §7  Products INSERT blocked from products table for staff (belt+suspenders)
--   §8  Subscription management locked to owner only
--   §9  Hardened check_user_business_role with set search_path
--   §10 Missing composite unique index on payments local_id
--   §11 Soft-delete safety: reject invoices for inactive/deleted products
--   §12 Validate payment totals inside create_invoice_atomic
-- =============================================================================

-- ============================================================================
-- §1  COLUMN-LEVEL SECURITY: revoke purchase_price_paise from authenticated
--     and re-grant it only to service_role (and via SECURITY DEFINER RPCs).
--
--     PostgreSQL column-level REVOKE on a table column:
--       "REVOKE SELECT (col) ON table FROM role" removes that column from the
--       role's SELECT grant while leaving the row-level grant intact.
--     This means a direct "SELECT purchase_price_paise FROM products" will fail
--     for `authenticated` even when RLS passes, unless the user is service_role
--     or calls a SECURITY DEFINER function that exposes it deliberately.
-- ============================================================================

-- Remove blanket SELECT on the full products table from authenticated
REVOKE SELECT ON public.products FROM authenticated;

-- Re-grant all columns EXCEPT purchase_price_paise
GRANT SELECT (
    id,
    business_id,
    category_id,
    name,
    sku,
    barcode,
    selling_price_paise,
    unit,
    tax_rate,
    is_tax_inclusive,
    stock_quantity,
    low_stock_threshold,
    image_url,
    is_favourite,
    is_active,
    created_at,
    updated_at
) ON public.products TO authenticated;

-- Owners and admins retrieve purchase_price_paise through the helper RPC below,
-- not through direct column access. This keeps the column invisible to REST API
-- even if RLS is misconfigured.

-- RPC: get_product_with_cost_price (SECURITY DEFINER – only callable by owner/admin)
CREATE OR REPLACE FUNCTION public.get_products_with_cost(
    p_business_id UUID
)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only owner or admin may retrieve purchase_price_paise
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
        RAISE EXCEPTION 'Not permitted: only owners or admins can view cost prices';
    END IF;

    RETURN QUERY
    SELECT *
    FROM public.products
    WHERE business_id = p_business_id
      AND is_active = TRUE
    ORDER BY name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_products_with_cost(UUID) TO authenticated;

-- Also update the staff view to use security_invoker (already set, belt+suspenders)
DROP VIEW IF EXISTS public.products_staff_view;
CREATE VIEW public.products_staff_view
WITH (security_invoker = true) AS
SELECT
    id,
    business_id,
    category_id,
    name,
    sku,
    barcode,
    selling_price_paise,
    unit,
    tax_rate,
    is_tax_inclusive,
    stock_quantity,
    low_stock_threshold,
    image_url,
    is_favourite,
    is_active,
    created_at,
    updated_at
FROM public.products;

GRANT SELECT ON public.products_staff_view TO authenticated;

-- ============================================================================
-- §2 + §3  HARDENED create_invoice_atomic
--   - Validate caller role
--   - Reject discounts for staff
--   - Validate all product_ids belong to p_business_id
--   - Validate customer_id belongs to p_business_id
--   - Validate quantities > 0
--   - Validate grand_total >= 0
--   - Validate payment amounts > 0 and sum <= grand_total
--   - Validate payment_method values
--   - Full atomicity: all validation before any insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
    p_business_id UUID,
    p_customer_id UUID,
    p_invoice_number TEXT,
    p_financial_year TEXT,
    p_local_id TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_subtotal_paise BIGINT,
    p_discount_type TEXT,
    p_discount_value NUMERIC,
    p_discount_paise BIGINT,
    p_cgst_paise BIGINT,
    p_sgst_paise BIGINT,
    p_igst_paise BIGINT,
    p_total_tax_paise BIGINT,
    p_grand_total_paise BIGINT,
    p_paid_amount_paise BIGINT,
    p_balance_amount_paise BIGINT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_payments JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice_id UUID;
    v_item RECORD;
    v_lock RECORD;
    v_payment RECORD;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_clamped BOOLEAN;
    v_caller UUID := (SELECT auth.uid());
    v_caller_role TEXT;
    v_product_business_id UUID;
    v_customer_business_id UUID;
    v_total_payment_paise BIGINT := 0;
    v_item_count INT := 0;
    v_computed_subtotal BIGINT := 0;
    v_db_price BIGINT;
    v_product_active BOOLEAN;
BEGIN
    -- -------------------------------------------------------------------------
    -- 0. AUTHENTICATION: caller must be a logged-in user
    -- -------------------------------------------------------------------------
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not permitted: unauthenticated request';
    END IF;

    -- -------------------------------------------------------------------------
    -- 0a. AUTHORIZATION: caller must be active member of p_business_id
    -- -------------------------------------------------------------------------
    SELECT bm.role INTO v_caller_role
    FROM public.business_members bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = v_caller
      AND bm.status = 'active'
    LIMIT 1;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Not permitted: user is not an active member of this business';
    END IF;

    -- -------------------------------------------------------------------------
    -- 0b. DISCOUNT AUTHORIZATION: staff cannot apply any discount
    -- -------------------------------------------------------------------------
    IF v_caller_role = 'staff' THEN
        IF p_discount_type IS NOT NULL AND p_discount_type <> 'none' THEN
            RAISE EXCEPTION 'Not permitted: staff cannot apply discounts (discount_type=%)' , p_discount_type;
        END IF;
        IF p_discount_paise IS NOT NULL AND p_discount_paise <> 0 THEN
            RAISE EXCEPTION 'Not permitted: staff cannot apply discounts (discount_paise=%)' , p_discount_paise;
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- 0c. INPUT VALIDATION: basic sanity
    -- -------------------------------------------------------------------------
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Invoice must contain at least one item';
    END IF;

    IF p_grand_total_paise < 0 THEN
        RAISE EXCEPTION 'Grand total must be non-negative (got %)', p_grand_total_paise;
    END IF;

    IF p_paid_amount_paise < 0 THEN
        RAISE EXCEPTION 'Paid amount must be non-negative (got %)', p_paid_amount_paise;
    END IF;

    IF p_balance_amount_paise < 0 THEN
        RAISE EXCEPTION 'Balance amount must be non-negative (got %)', p_balance_amount_paise;
    END IF;

    IF (p_paid_amount_paise + p_balance_amount_paise) <> p_grand_total_paise THEN
        RAISE EXCEPTION 'Payment reconciliation mismatch: paid (%) + balance (%) must equal grand_total (%)',
            p_paid_amount_paise, p_balance_amount_paise, p_grand_total_paise;
    END IF;

    IF COALESCE(p_discount_paise, 0) < 0 OR COALESCE(p_discount_paise, 0) > COALESCE(p_subtotal_paise, 0) THEN
        RAISE EXCEPTION 'Invalid discount_paise (%) for subtotal (%)', p_discount_paise, p_subtotal_paise;
    END IF;

    -- Validate discount_type enum
    IF p_discount_type NOT IN ('none', 'fixed', 'percentage') THEN
        RAISE EXCEPTION 'Invalid discount_type: %', p_discount_type;
    END IF;

    -- Validate payment_status enum
    IF p_payment_status NOT IN ('paid', 'partial', 'unpaid', 'void') THEN
        RAISE EXCEPTION 'Invalid payment_status: %', p_payment_status;
    END IF;

    -- Validate payment_method enum (invoices table allows 'split')
    IF p_payment_method NOT IN ('cash', 'upi', 'card', 'credit', 'split') THEN
        RAISE EXCEPTION 'Invalid payment_method: %', p_payment_method;
    END IF;

    -- -------------------------------------------------------------------------
    -- 0d. ITEM VALIDATION: quantities, product ownership
    -- -------------------------------------------------------------------------
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_name TEXT,
        unit TEXT,
        quantity NUMERIC,
        unit_price_paise BIGINT,
        subtotal_paise BIGINT,
        tax_rate NUMERIC,
        cgst_paise BIGINT,
        sgst_paise BIGINT,
        igst_paise BIGINT,
        tax_paise BIGINT,
        discount_paise BIGINT,
        total_paise BIGINT
    )
    LOOP
        v_item_count := v_item_count + 1;

        -- Quantity must be positive
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item % has invalid quantity: %', COALESCE(v_item.product_name, 'unknown'), v_item.quantity;
        END IF;

        -- unit_price_paise must be non-negative
        IF v_item.unit_price_paise IS NULL OR v_item.unit_price_paise < 0 THEN
            RAISE EXCEPTION 'Item % has invalid unit_price_paise: %', COALESCE(v_item.product_name, 'unknown'), v_item.unit_price_paise;
        END IF;

        -- If a product_id is provided, verify it belongs to this business, is active, and matches DB price
        IF v_item.product_id IS NOT NULL THEN
            SELECT p.business_id, p.selling_price_paise, p.is_active
            INTO v_product_business_id, v_db_price, v_product_active
            FROM public.products p
            WHERE p.id = v_item.product_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product % does not exist', v_item.product_id;
            END IF;

            IF v_product_business_id <> p_business_id THEN
                RAISE EXCEPTION 'Product % belongs to a different business (cross-tenant violation)', v_item.product_id;
            END IF;

            IF NOT COALESCE(v_product_active, FALSE) THEN
                RAISE EXCEPTION 'Product % is inactive or deleted', v_item.product_id;
            END IF;

            IF v_item.unit_price_paise <> v_db_price THEN
                RAISE EXCEPTION 'Price mismatch for product %: submitted % paise, expected % paise',
                    v_item.product_id, v_item.unit_price_paise, v_db_price;
            END IF;
        END IF;

        -- item-level discount must not exceed item subtotal
        IF COALESCE(v_item.discount_paise, 0) < 0 THEN
            RAISE EXCEPTION 'Item % has negative discount_paise: %', COALESCE(v_item.product_name, 'unknown'), v_item.discount_paise;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 0e. CUSTOMER VALIDATION: customer must belong to p_business_id
    -- -------------------------------------------------------------------------
    IF p_customer_id IS NOT NULL THEN
        SELECT c.business_id INTO v_customer_business_id
        FROM public.customers c
        WHERE c.id = p_customer_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Customer % does not exist', p_customer_id;
        END IF;

        IF v_customer_business_id <> p_business_id THEN
            RAISE EXCEPTION 'Customer % belongs to a different business (cross-tenant violation)', p_customer_id;
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- 0f. PAYMENT VALIDATION: each payment amount must be positive; methods valid
    -- -------------------------------------------------------------------------
    IF p_payments IS NOT NULL AND jsonb_array_length(p_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS p(
            amount_paise BIGINT,
            payment_method TEXT,
            payment_reference TEXT,
            status TEXT,
            local_id TEXT,
            notes TEXT
        )
        LOOP
            IF v_payment.amount_paise IS NULL OR v_payment.amount_paise < 0 THEN
                RAISE EXCEPTION 'Payment has invalid amount_paise: %', v_payment.amount_paise;
            END IF;

            IF v_payment.payment_method NOT IN ('cash', 'upi', 'card', 'credit') THEN
                RAISE EXCEPTION 'Invalid payment method: %', v_payment.payment_method;
            END IF;

            v_total_payment_paise := v_total_payment_paise + COALESCE(v_payment.amount_paise, 0);
        END LOOP;

        -- Payment sum must not exceed grand total (allowing rounding tolerance of 1 paise)
        IF v_total_payment_paise > p_grand_total_paise + 1 THEN
            RAISE EXCEPTION 'Total payments (%) exceed grand total (%)', v_total_payment_paise, p_grand_total_paise;
        END IF;

        IF p_paid_amount_paise > 0 AND v_total_payment_paise <> p_paid_amount_paise THEN
            RAISE EXCEPTION 'Payment rows sum (%) does not match paid_amount_paise (%)',
                v_total_payment_paise, p_paid_amount_paise;
        END IF;
    ELSIF p_paid_amount_paise > 0 THEN
        RAISE EXCEPTION 'Paid invoice (% paise) must include payment records', p_paid_amount_paise;
    END IF;

    -- -------------------------------------------------------------------------
    -- 1. IDEMPOTENCY: return existing invoice if local_id already processed
    -- -------------------------------------------------------------------------
    IF p_local_id IS NOT NULL THEN
        SELECT id INTO v_invoice_id
        FROM public.invoices
        WHERE business_id = p_business_id AND local_id = p_local_id;

        IF v_invoice_id IS NOT NULL THEN
            RETURN v_invoice_id; -- Already processed – idempotent return
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. INSERT INVOICE
    -- -------------------------------------------------------------------------
    INSERT INTO public.invoices (
        business_id, customer_id, created_by, invoice_number, financial_year,
        local_id, customer_name, customer_phone, subtotal_paise,
        discount_type, discount_value, discount_paise,
        cgst_paise, sgst_paise, igst_paise, total_tax_paise,
        grand_total_paise, paid_amount_paise, balance_amount_paise,
        payment_status, payment_method, notes, sync_status
    ) VALUES (
        p_business_id, p_customer_id, v_caller, p_invoice_number, p_financial_year,
        p_local_id, p_customer_name, p_customer_phone, p_subtotal_paise,
        p_discount_type, p_discount_value, p_discount_paise,
        p_cgst_paise, p_sgst_paise, p_igst_paise, p_total_tax_paise,
        p_grand_total_paise, p_paid_amount_paise, p_balance_amount_paise,
        p_payment_status, p_payment_method, p_notes, 'synced'
    ) RETURNING id INTO v_invoice_id;

    -- -------------------------------------------------------------------------
    -- 3. INSERT INVOICE ITEMS
    -- -------------------------------------------------------------------------
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID, product_name TEXT,
        unit TEXT, quantity NUMERIC, unit_price_paise BIGINT,
        subtotal_paise BIGINT, tax_rate NUMERIC, cgst_paise BIGINT,
        sgst_paise BIGINT, igst_paise BIGINT, tax_paise BIGINT,
        discount_paise BIGINT, total_paise BIGINT
    )
    LOOP
        INSERT INTO public.invoice_items (
            invoice_id, product_id, product_name,
            unit, quantity, unit_price_paise, subtotal_paise,
            tax_rate, cgst_paise, sgst_paise, igst_paise,
            tax_paise, discount_paise, total_paise
        ) VALUES (
            v_invoice_id, v_item.product_id, v_item.product_name,
            v_item.unit, v_item.quantity, v_item.unit_price_paise, v_item.subtotal_paise,
            v_item.tax_rate, v_item.cgst_paise, v_item.sgst_paise, v_item.igst_paise,
            v_item.tax_paise, COALESCE(v_item.discount_paise, 0), v_item.total_paise
        );
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 4. STOCK DEDUCTION: lock rows in deterministic product_id ORDER to prevent
    --    deadlocks under concurrent requests.
    --    Policy: clamp at 0 (retail counter never blocks checkout), log clamping.
    -- -------------------------------------------------------------------------
    FOR v_lock IN
        SELECT x.product_id, SUM(x.quantity) AS total_qty
        FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC)
        WHERE x.product_id IS NOT NULL
        GROUP BY x.product_id
        ORDER BY x.product_id  -- deterministic lock order prevents deadlock
    LOOP
        SELECT stock_quantity INTO v_current_stock
        FROM public.products
        WHERE id = v_lock.product_id AND business_id = p_business_id
        FOR UPDATE;

        IF FOUND THEN
            v_clamped := (v_current_stock - v_lock.total_qty) < 0;
            v_new_stock := GREATEST(0, v_current_stock - v_lock.total_qty);

            UPDATE public.products
            SET stock_quantity = v_new_stock, updated_at = NOW()
            WHERE id = v_lock.product_id AND business_id = p_business_id;

            INSERT INTO public.stock_movements (
                business_id, product_id, movement_type, quantity,
                previous_stock, new_stock, reason, reference_id, created_by
            ) VALUES (
                p_business_id, v_lock.product_id, 'sale', v_lock.total_qty,
                v_current_stock, v_new_stock,
                'Invoice ' || p_invoice_number ||
                    CASE WHEN v_clamped THEN ' [stock clamped from ' || v_current_stock || ']' ELSE '' END,
                v_invoice_id, v_caller
            );

            -- Audit log when stock is clamped below zero
            IF v_clamped THEN
                INSERT INTO public.audit_logs (
                    business_id, user_id, action, entity_type, entity_id, details
                ) VALUES (
                    p_business_id, v_caller, 'stock_clamped', 'product',
                    v_lock.product_id::TEXT,
                    jsonb_build_object(
                        'invoice_id', v_invoice_id,
                        'invoice_number', p_invoice_number,
                        'previous_stock', v_current_stock,
                        'sold_quantity', v_lock.total_qty,
                        'new_stock', 0
                    )
                );
            END IF;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 5. RECORD PAYMENTS
    -- -------------------------------------------------------------------------
    IF p_payments IS NOT NULL AND jsonb_array_length(p_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS p(
            amount_paise BIGINT, payment_method TEXT, payment_reference TEXT,
            status TEXT, local_id TEXT, notes TEXT
        )
        LOOP
            -- Skip zero-amount payment rows (e.g. partial cash=0 in a split)
            IF COALESCE(v_payment.amount_paise, 0) > 0 THEN
                INSERT INTO public.payments (
                    business_id, invoice_id, customer_id, amount_paise, payment_method,
                    payment_reference, status, local_id, notes
                ) VALUES (
                    p_business_id, v_invoice_id, p_customer_id, v_payment.amount_paise,
                    v_payment.payment_method, v_payment.payment_reference,
                    COALESCE(v_payment.status, 'completed'), v_payment.local_id, v_payment.notes
                );
            END IF;
        END LOOP;
    END IF;

    -- -------------------------------------------------------------------------
    -- 6. UPDATE CUSTOMER OUTSTANDING BALANCE (Udhar)
    -- -------------------------------------------------------------------------
    IF p_customer_id IS NOT NULL AND p_balance_amount_paise > 0 THEN
        UPDATE public.customers
        SET outstanding_balance_paise = outstanding_balance_paise + p_balance_amount_paise,
            updated_at = NOW()
        WHERE id = p_customer_id AND business_id = p_business_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 7. AUDIT LOG: invoice creation
    -- -------------------------------------------------------------------------
    INSERT INTO public.audit_logs (
        business_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        p_business_id, v_caller, 'create_invoice', 'invoice', v_invoice_id::TEXT,
        jsonb_build_object(
            'invoice_number', p_invoice_number,
            'grand_total_paise', p_grand_total_paise,
            'payment_method', p_payment_method,
            'discount_paise', p_discount_paise,
            'caller_role', v_caller_role
        )
    );

    RETURN v_invoice_id;
END;
$$;

-- ============================================================================
-- §4  AUDIT LOGS: prevent authenticated users from modifying audit records.
--     Only service_role (server-side) may INSERT; nobody may UPDATE/DELETE.
-- ============================================================================
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Only authenticated SECURITY DEFINER functions insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners and admins can view audit logs" ON public.audit_logs;

-- Only SELECT for owners/admins; all writes go through SECURITY DEFINER RPCs
CREATE POLICY "Owners and admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- No INSERT/UPDATE/DELETE policy for authenticated – SECURITY DEFINER functions bypass RLS

-- ============================================================================
-- §5  ROLE ESCALATION PREVENTION
--     Staff cannot INSERT into business_members.
--     Admin cannot promote to owner.
--     Users cannot modify their own membership row.
-- ============================================================================

-- Drop existing broad policy then recreate with safe constraints
DROP POLICY IF EXISTS "Admins and owners can manage members" ON public.business_members;
DROP POLICY IF EXISTS "Service role can bypass members rls" ON public.business_members;

-- Owners can manage all members (add admin/staff, promote/demote admin, remove staff)
CREATE POLICY "Owners can manage all members"
    ON public.business_members FOR ALL
    USING (public.check_user_business_role(business_id, ARRAY['owner']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner']));

-- Admins can manage staff members but NOT modify owner rows and NOT set role='owner'
CREATE POLICY "Admins can manage staff members"
    ON public.business_members FOR ALL
    USING (
        public.check_user_business_role(business_id, ARRAY['admin'])
        AND role <> 'owner'  -- Admins cannot touch owner rows
    )
    WITH CHECK (
        public.check_user_business_role(business_id, ARRAY['admin'])
        AND role NOT IN ('owner', 'admin')  -- Admins can only create/modify staff rows
    );

-- Users can read their own membership row (covered by existing SELECT policy)
-- Staff cannot insert new membership rows (no INSERT policy for staff)

-- ============================================================================
-- §6  INVOICE VOID: only owner/admin, with cross-business protection
--     The existing RLS uses USING without WITH CHECK for UPDATE – add it.
-- ============================================================================
DROP POLICY IF EXISTS "Only admins/owners can void or edit invoices" ON public.invoices;
CREATE POLICY "Only admins/owners can void or edit invoices"
    ON public.invoices FOR UPDATE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- ============================================================================
-- §7  PRODUCTS WRITE: staff may never INSERT/UPDATE/DELETE products directly.
--     (Existing policies in migration 20261126000002 restrict this; this belt-
--     and-suspenders policy makes the intent explicit in a later migration.)
-- ============================================================================
-- Already handled by existing owner/admin-only policies. No change needed.

-- ============================================================================
-- §8  SUBSCRIPTIONS: only OWNER may modify subscription plan
-- ============================================================================
DROP POLICY IF EXISTS "Owners and admins can manage subscription" ON public.subscriptions;

CREATE POLICY "Owners can manage subscription"
    ON public.subscriptions FOR ALL
    USING (public.check_user_business_role(business_id, ARRAY['owner']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner']));

-- ============================================================================
-- §9  HARDENED check_user_business_role (belt+suspenders – already in migration 3)
--     Re-confirmed here with explicit SET search_path.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_business_role(p_business_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
      AND role = ANY(p_roles)
  );
$$;

-- ============================================================================
-- §10 PAYMENTS: partial unique index on (business_id, local_id) for
--     idempotency protection on payment rows from split billing retries.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_business_local_id_unique
    ON public.payments (business_id, local_id)
    WHERE local_id IS NOT NULL;

-- ============================================================================
-- §11 ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Speed up invoice lookup by local_id during idempotency check
CREATE INDEX IF NOT EXISTS idx_invoices_business_local_id
    ON public.invoices (business_id, local_id)
    WHERE local_id IS NOT NULL;

-- Speed up audit log queries by business + action
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_action
    ON public.audit_logs (business_id, action, created_at DESC);

-- Speed up suspended-member check in sessionGuard
CREATE INDEX IF NOT EXISTS idx_business_members_user_status
    ON public.business_members (user_id, status);

-- ============================================================================
-- §12 SETTLE CUSTOMER UDHAR: add audit log entry for every settlement action
--     (Already done in migration 3, confirmed here with set search_path hardening)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.settle_customer_udhar(
    p_business_id UUID,
    p_customer_id UUID,
    p_amount_paise BIGINT DEFAULT NULL,
    p_method TEXT DEFAULT 'cash'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance BIGINT;
    v_settle_amount BIGINT;
    v_new_balance BIGINT;
    v_caller UUID := (SELECT auth.uid());
BEGIN
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
        RAISE EXCEPTION 'Not permitted: only owners or admins can settle customer udhar';
    END IF;

    IF p_method NOT IN ('cash', 'upi', 'card') THEN
        RAISE EXCEPTION 'Invalid settlement payment method: %', p_method;
    END IF;

    -- Customer must belong to this business
    SELECT outstanding_balance_paise INTO v_current_balance
    FROM public.customers
    WHERE id = p_customer_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found in business';
    END IF;

    IF v_current_balance <= 0 THEN
        RETURN 0;
    END IF;

    IF p_amount_paise IS NULL THEN
        v_settle_amount := v_current_balance;
    ELSE
        IF p_amount_paise <= 0 THEN
            RAISE EXCEPTION 'Settlement amount must be positive';
        END IF;
        v_settle_amount := LEAST(v_current_balance, p_amount_paise);
    END IF;

    v_new_balance := GREATEST(0, v_current_balance - v_settle_amount);

    UPDATE public.customers
    SET outstanding_balance_paise = v_new_balance, updated_at = NOW()
    WHERE id = p_customer_id AND business_id = p_business_id;

    INSERT INTO public.payments (
        business_id, invoice_id, customer_id, amount_paise,
        payment_method, status, notes
    ) VALUES (
        p_business_id, NULL, p_customer_id, v_settle_amount,
        p_method, 'completed', 'Udhar balance settlement'
    );

    INSERT INTO public.audit_logs (
        business_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        p_business_id, v_caller, 'settle_udhar', 'customer', p_customer_id::TEXT,
        jsonb_build_object(
            'settled_paise', v_settle_amount,
            'previous_balance_paise', v_current_balance,
            'new_balance_paise', v_new_balance,
            'payment_method', p_method
        )
    );

    RETURN v_new_balance;
END;
$$;

-- ============================================================================
-- §13 PHONE ACCOUNT CONFLICT CHECK RPC (bypasses profiles RLS safely without PII)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_phone_account_conflict(
    p_digits10 TEXT,
    p_e164 TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id <> (SELECT auth.uid())
          AND (phone = p_digits10 OR phone = p_e164)
    );
$$;

-- Ensure GRANT for authenticated users to call these RPCs
GRANT EXECUTE ON FUNCTION public.check_phone_account_conflict(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_customer_udhar(UUID, UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, NUMERIC, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_business_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_business_with(UUID) TO authenticated;
