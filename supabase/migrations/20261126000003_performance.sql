-- QuickBill: Database Performance Indexes, RLS InitPlan Optimization, Atomic RPCs & Daily Sales View
-- Migration: 20261126000003_performance.sql

-- ============================================================================
-- 1. PERFORMANCE & UNIQUENESS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_business_created_at
    ON public.invoices (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_business_creator_created_at
    ON public.invoices (business_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_business_active_name
    ON public.products (business_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_categories_business_active
    ON public.categories (business_id, is_active);

CREATE INDEX IF NOT EXISTS idx_payments_business_created_at
    ON public.payments (business_id, created_at);

CREATE INDEX IF NOT EXISTS idx_stock_movements_business_product_created_at
    ON public.stock_movements (business_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_business_name
    ON public.customers (business_id, name);

CREATE INDEX IF NOT EXISTS idx_business_members_business_user_status
    ON public.business_members (business_id, user_id, status);

-- Race-safe partial unique index for idempotent create_invoice_atomic retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_business_local_id_unique
    ON public.invoices (business_id, local_id)
    WHERE local_id IS NOT NULL;

-- Allow standalone Udhar settlement rows in payments (not tied to a single invoice)
ALTER TABLE public.payments
    ALTER COLUMN invoice_id DROP NOT NULL;

-- ============================================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS (InitPlan-friendly auth.uid() + search_path)
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

CREATE OR REPLACE FUNCTION public.shares_business_with(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm_caller
    JOIN public.business_members bm_target
      ON bm_target.business_id = bm_caller.business_id
    WHERE bm_caller.user_id = (SELECT auth.uid())
      AND bm_caller.status = 'active'
      AND bm_caller.role IN ('owner', 'admin')
      AND bm_target.user_id = p_user
  );
$$;

-- ============================================================================
-- 3. RLS POLICIES: Wrap auth.uid() in (SELECT auth.uid()) for single evaluation per query
-- ============================================================================
-- PROFILES
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.profiles;
CREATE POLICY "Users can view and update own profile"
    ON public.profiles FOR ALL
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Owners and admins can view team profiles" ON public.profiles;
CREATE POLICY "Owners and admins can view team profiles"
    ON public.profiles FOR SELECT
    USING (
        (SELECT auth.uid()) = id
        OR public.shares_business_with(id)
    );

-- BUSINESSES
DROP POLICY IF EXISTS "Members can view their business" ON public.businesses;
CREATE POLICY "Members can view their business"
    ON public.businesses FOR SELECT
    USING ((SELECT auth.uid()) = owner_id OR public.check_user_business_role(id, ARRAY['owner', 'admin', 'staff']));

DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
CREATE POLICY "Owners and admins can update business"
    ON public.businesses FOR UPDATE
    USING ((SELECT auth.uid()) = owner_id OR public.check_user_business_role(id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Authenticated users can create business"
    ON public.businesses FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = owner_id);

-- BUSINESS MEMBERS
DROP POLICY IF EXISTS "Members can view staff in business" ON public.business_members;
CREATE POLICY "Members can view staff in business"
    ON public.business_members FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR public.check_user_business_role(business_id, ARRAY['owner', 'admin'])
    );

DROP POLICY IF EXISTS "Owners can add initial membership" ON public.business_members;
CREATE POLICY "Owners can add initial membership"
    ON public.business_members FOR INSERT
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = business_id AND b.owner_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins and owners can manage members" ON public.business_members;
CREATE POLICY "Admins and owners can manage members"
    ON public.business_members FOR ALL
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- INVOICES & INVOICE ITEMS
DROP POLICY IF EXISTS "Members can view invoices" ON public.invoices;
CREATE POLICY "Members can view invoices"
    ON public.invoices FOR SELECT
    USING (
        public.check_user_business_role(business_id, ARRAY['owner', 'admin'])
        OR (
            created_by = (SELECT auth.uid())
            AND public.check_user_business_role(business_id, ARRAY['staff'])
        )
    );

DROP POLICY IF EXISTS "Members can view invoice items" ON public.invoice_items;
CREATE POLICY "Members can view invoice items"
    ON public.invoice_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.invoices i
            WHERE i.id = invoice_id
              AND (
                  public.check_user_business_role(i.business_id, ARRAY['owner', 'admin'])
                  OR (
                      i.created_by = (SELECT auth.uid())
                      AND public.check_user_business_role(i.business_id, ARRAY['staff'])
                  )
              )
        )
    );

-- ============================================================================
-- 4. ATOMIC STOCK ADJUSTMENT RPC (Replaces client-side read-modify-write)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.adjust_stock(
    p_business_id UUID,
    p_product_id UUID,
    p_movement_type TEXT,
    p_quantity NUMERIC,
    p_reason TEXT DEFAULT ''
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_clamped BOOLEAN := FALSE;
    v_reason TEXT;
BEGIN
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
        RAISE EXCEPTION 'Not permitted: only owners or admins can adjust stock';
    END IF;

    IF p_movement_type NOT IN ('adjustment', 'purchase', 'return') THEN
        RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
    END IF;

    IF p_quantity IS NULL OR p_quantity < 0 THEN
        RAISE EXCEPTION 'Quantity must be non-negative';
    END IF;

    SELECT stock_quantity INTO v_current_stock
    FROM public.products
    WHERE id = p_product_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found in business';
    END IF;

    IF p_movement_type = 'return' THEN
        IF v_current_stock - p_quantity < 0 THEN
            v_new_stock := 0;
            v_clamped := TRUE;
        ELSE
            v_new_stock := v_current_stock - p_quantity;
        END IF;
    ELSE
        v_new_stock := v_current_stock + p_quantity;
    END IF;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id AND business_id = p_business_id;

    v_reason := COALESCE(NULLIF(TRIM(p_reason), ''), p_movement_type);
    IF v_clamped THEN
        v_reason := v_reason || ' [clamped to 0]';
    END IF;

    INSERT INTO public.stock_movements (
        business_id, product_id, movement_type, quantity,
        previous_stock, new_stock, reason, created_by
    ) VALUES (
        p_business_id, p_product_id, p_movement_type, p_quantity,
        v_current_stock, v_new_stock, v_reason, (SELECT auth.uid())
    );

    RETURN v_new_stock;
END;
$$;

-- ============================================================================
-- 5. ATOMIC CUSTOMER UDHAR SETTLEMENT RPC (Balance + Payment + Audit Log)
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
BEGIN
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
        RAISE EXCEPTION 'Not permitted: only owners or admins can settle customer udhar';
    END IF;

    IF p_method NOT IN ('cash', 'upi', 'card') THEN
        RAISE EXCEPTION 'Invalid settlement payment method: %', p_method;
    END IF;

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
    SET outstanding_balance_paise = v_new_balance,
        updated_at = NOW()
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
        p_business_id,
        (SELECT auth.uid()),
        'settle_udhar',
        'customer',
        p_customer_id::TEXT,
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
-- 6. HARDENED ATOMIC INVOICE CREATION RPC (Ordered Row Locks & Stock Clamp Logging)
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
BEGIN
    -- 0. Membership & role authorization check
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin', 'staff']) THEN
        RAISE EXCEPTION 'Not permitted: user is not an active member of this business';
    END IF;

    -- 1. Idempotency check via partial unique index on (business_id, local_id)
    IF p_local_id IS NOT NULL THEN
        SELECT id INTO v_invoice_id FROM public.invoices
        WHERE business_id = p_business_id AND local_id = p_local_id;
        IF v_invoice_id IS NOT NULL THEN
            RETURN v_invoice_id; -- Already processed
        END IF;
    END IF;

    -- 2. Insert Invoice
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

    -- 3. Insert Invoice Items
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
            v_item.tax_paise, v_item.discount_paise, v_item.total_paise
        );
    END LOOP;

    -- 4. Lock & decrement products once per product_id in deterministic ORDER BY product_id to prevent deadlocks.
    --    Policy choice: clamp stock at 0 (retail counter does not block checkout) and log clamping in stock_movements & audit_logs.
    FOR v_lock IN
        SELECT x.product_id, SUM(x.quantity) AS total_qty
        FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC)
        WHERE x.product_id IS NOT NULL
        GROUP BY x.product_id
        ORDER BY x.product_id
    LOOP
        SELECT stock_quantity INTO v_current_stock
        FROM public.products
        WHERE id = v_lock.product_id AND business_id = p_business_id
        FOR UPDATE;

        IF FOUND THEN
            v_clamped := (v_current_stock - v_lock.total_qty) < 0;
            v_new_stock := GREATEST(0, v_current_stock - v_lock.total_qty);

            UPDATE public.products
            SET stock_quantity = v_new_stock,
                updated_at = NOW()
            WHERE id = v_lock.product_id AND business_id = p_business_id;

            INSERT INTO public.stock_movements (
                business_id, product_id, movement_type, quantity,
                previous_stock, new_stock, reason, reference_id, created_by
            ) VALUES (
                p_business_id,
                v_lock.product_id,
                'sale',
                v_lock.total_qty,
                v_current_stock,
                v_new_stock,
                'Invoice ' || p_invoice_number || CASE WHEN v_clamped THEN ' [clamped from ' || v_current_stock || ']' ELSE '' END,
                v_invoice_id,
                v_caller
            );

            IF v_clamped THEN
                INSERT INTO public.audit_logs (
                    business_id, user_id, action, entity_type, entity_id, details
                ) VALUES (
                    p_business_id,
                    v_caller,
                    'stock_clamped',
                    'product',
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

    -- 5. Record Payments
    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_payments) AS p(
            amount_paise BIGINT, payment_method TEXT, payment_reference TEXT, status TEXT, local_id TEXT, notes TEXT
        )
        LOOP
            INSERT INTO public.payments (
                business_id, invoice_id, customer_id, amount_paise, payment_method,
                payment_reference, status, local_id, notes
            ) VALUES (
                p_business_id, v_invoice_id, p_customer_id, v_payment.amount_paise,
                v_payment.payment_method, v_payment.payment_reference,
                COALESCE(v_payment.status, 'completed'), v_payment.local_id, v_payment.notes
            );
        END LOOP;
    END IF;

    -- 6. Update Customer Outstanding Balance if there is unpaid credit balance
    IF p_customer_id IS NOT NULL AND p_balance_amount_paise > 0 THEN
        UPDATE public.customers
        SET outstanding_balance_paise = outstanding_balance_paise + p_balance_amount_paise,
            updated_at = NOW()
        WHERE id = p_customer_id AND business_id = p_business_id;
    END IF;

    RETURN v_invoice_id;
END;
$$;

-- ============================================================================
-- 7. SERVER-SIDE DAILY SALES AGGREGATION VIEW
-- ============================================================================
DROP VIEW IF EXISTS public.reports_daily_sales;
CREATE VIEW public.reports_daily_sales
WITH (security_invoker = true) AS
SELECT
    i.business_id,
    DATE(i.created_at AT TIME ZONE 'Asia/Kolkata') AS day,
    COUNT(*)::INT AS bills,
    COALESCE(SUM(i.grand_total_paise), 0)::BIGINT AS revenue_paise,
    COALESCE(SUM(i.total_tax_paise), 0)::BIGINT AS tax_paise,
    COALESCE(SUM(i.cgst_paise), 0)::BIGINT AS cgst_paise,
    COALESCE(SUM(i.sgst_paise), 0)::BIGINT AS sgst_paise,
    COALESCE(SUM(i.igst_paise), 0)::BIGINT AS igst_paise,
    COALESCE(SUM(i.discount_paise), 0)::BIGINT AS discount_paise,
    COALESCE(SUM(i.balance_amount_paise), 0)::BIGINT AS pending_udhar_paise,
    COALESCE(SUM(COALESCE(p.cash_paise, CASE WHEN i.payment_method = 'cash' THEN i.paid_amount_paise ELSE 0 END)), 0)::BIGINT AS cash_paise,
    COALESCE(SUM(COALESCE(p.upi_paise, CASE WHEN i.payment_method = 'upi' THEN i.paid_amount_paise ELSE 0 END)), 0)::BIGINT AS upi_paise,
    COALESCE(SUM(COALESCE(p.card_paise, CASE WHEN i.payment_method = 'card' THEN i.paid_amount_paise ELSE 0 END)), 0)::BIGINT AS card_paise
FROM public.invoices i
LEFT JOIN (
    SELECT
        invoice_id,
        SUM(CASE WHEN payment_method = 'cash' THEN amount_paise ELSE 0 END) AS cash_paise,
        SUM(CASE WHEN payment_method = 'upi' THEN amount_paise ELSE 0 END) AS upi_paise,
        SUM(CASE WHEN payment_method = 'card' THEN amount_paise ELSE 0 END) AS card_paise
    FROM public.payments
    WHERE invoice_id IS NOT NULL
      AND status = 'completed'
    GROUP BY invoice_id
) p ON p.invoice_id = i.id
WHERE i.is_void = FALSE
GROUP BY i.business_id, DATE(i.created_at AT TIME ZONE 'Asia/Kolkata');

GRANT SELECT ON public.reports_daily_sales TO authenticated;
