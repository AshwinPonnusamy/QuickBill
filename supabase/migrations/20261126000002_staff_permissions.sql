-- QuickBill: Staff / Owner Role-Based Access Control (RLS, Views & RPC Hardening)
-- Migration: 20261126000002_staff_permissions.sql

-- 1. PRODUCTS: Staff can read products (without cost price via view); only owner/admin can write
DROP POLICY IF EXISTS "Members can read products" ON public.products;
DROP POLICY IF EXISTS "Staff can update stock / admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Owners and admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Owners and admins can update products" ON public.products;
DROP POLICY IF EXISTS "Owners and admins can delete products" ON public.products;

CREATE POLICY "Members can read products"
    ON public.products FOR SELECT
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Owners and admins can insert products"
    ON public.products FOR INSERT
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update products"
    ON public.products FOR UPDATE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can delete products"
    ON public.products FOR DELETE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- Hardening view: omits purchase_price_paise so staff queries do not fetch cost prices
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

-- 2. CUSTOMERS: Staff can view and insert during billing; only owner/admin can update (e.g. settle udhar) or delete
DROP POLICY IF EXISTS "Members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Members can insert/update customers" ON public.customers;
DROP POLICY IF EXISTS "Members can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Owners and admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Owners and admins can delete customers" ON public.customers;

CREATE POLICY "Members can view customers"
    ON public.customers FOR SELECT
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Members can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Owners and admins can update customers"
    ON public.customers FOR UPDATE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can delete customers"
    ON public.customers FOR DELETE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- 3. PAYMENTS: Members can read; direct writes restricted to owner/admin (staff writes via create_invoice_atomic RPC only)
DROP POLICY IF EXISTS "Members can view and record payments" ON public.payments;
DROP POLICY IF EXISTS "Members can view payments" ON public.payments;
DROP POLICY IF EXISTS "Owners and admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Owners and admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Owners and admins can delete payments" ON public.payments;

CREATE POLICY "Members can view payments"
    ON public.payments FOR SELECT
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Owners and admins can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update payments"
    ON public.payments FOR UPDATE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can delete payments"
    ON public.payments FOR DELETE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- 4. STOCK MOVEMENTS: Members can read; direct writes restricted to owner/admin (staff writes via create_invoice_atomic RPC only)
DROP POLICY IF EXISTS "Members can view and log stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Members can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owners and admins can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owners and admins can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owners and admins can delete stock movements" ON public.stock_movements;

CREATE POLICY "Members can view stock movements"
    ON public.stock_movements FOR SELECT
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Owners and admins can insert stock movements"
    ON public.stock_movements FOR INSERT
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update stock movements"
    ON public.stock_movements FOR UPDATE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can delete stock movements"
    ON public.stock_movements FOR DELETE
    USING (public.check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- 5. INVOICES & INVOICE ITEMS: Owner/admin see all invoices; staff only see invoices they created
DROP POLICY IF EXISTS "Members can view invoices" ON public.invoices;
CREATE POLICY "Members can view invoices"
    ON public.invoices FOR SELECT
    USING (
        public.check_user_business_role(business_id, ARRAY['owner', 'admin'])
        OR (
            created_by = auth.uid()
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
                      i.created_by = auth.uid()
                      AND public.check_user_business_role(i.business_id, ARRAY['staff'])
                  )
              )
        )
    );

-- 6. BUSINESS MEMBERS: Owner/admin see all members of their business; staff see only their own membership row
DROP POLICY IF EXISTS "Members can view staff in business" ON public.business_members;
CREATE POLICY "Members can view staff in business"
    ON public.business_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.check_user_business_role(business_id, ARRAY['owner', 'admin'])
    );

-- 7. PROFILES SHARING HELPER & POLICY: Allow owner/admin to read profiles of members in their business
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
    WHERE bm_caller.user_id = auth.uid()
      AND bm_caller.status = 'active'
      AND bm_caller.role IN ('owner', 'admin')
      AND bm_target.user_id = p_user
  );
$$;

DROP POLICY IF EXISTS "Owners and admins can view team profiles" ON public.profiles;
CREATE POLICY "Owners and admins can view team profiles"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR public.shares_business_with(id)
    );

-- 8. ATOMIC INVOICE RPC HARDENING: Require active membership in p_business_id and lock search_path
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
    v_payment RECORD;
    v_current_stock NUMERIC;
BEGIN
    -- 0. Membership & role authorization check
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin', 'staff']) THEN
        RAISE EXCEPTION 'Not permitted: user is not an active member of this business';
    END IF;

    -- 1. Idempotency check via local_id
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
        p_business_id, p_customer_id, auth.uid(), p_invoice_number, p_financial_year,
        p_local_id, p_customer_name, p_customer_phone, p_subtotal_paise,
        p_discount_type, p_discount_value, p_discount_paise,
        p_cgst_paise, p_sgst_paise, p_igst_paise, p_total_tax_paise,
        p_grand_total_paise, p_paid_amount_paise, p_balance_amount_paise,
        p_payment_status, p_payment_method, p_notes, 'synced'
    ) RETURNING id INTO v_invoice_id;

    -- 3. Insert Invoice Items & Update Stock
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

        -- If product is tracked within this business, decrement stock and log movement
        IF v_item.product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_current_stock
            FROM public.products
            WHERE id = v_item.product_id AND business_id = p_business_id
            FOR UPDATE;

            IF FOUND THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity - v_item.quantity, updated_at = NOW()
                WHERE id = v_item.product_id AND business_id = p_business_id;

                INSERT INTO public.stock_movements (
                    business_id, product_id, movement_type, quantity,
                    previous_stock, new_stock, reason, reference_id, created_by
                ) VALUES (
                    p_business_id, v_item.product_id, 'sale', v_item.quantity,
                    v_current_stock, (v_current_stock - v_item.quantity), 'Invoice ' || p_invoice_number, v_invoice_id, auth.uid()
                );
            END IF;
        END IF;
    END LOOP;

    -- 4. Record Payments
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

    -- 5. Update Customer Outstanding Balance if there is unpaid credit balance
    IF p_customer_id IS NOT NULL AND p_balance_amount_paise > 0 THEN
        UPDATE public.customers
        SET outstanding_balance_paise = outstanding_balance_paise + p_balance_amount_paise,
            updated_at = NOW()
        WHERE id = p_customer_id AND business_id = p_business_id;
    END IF;

    RETURN v_invoice_id;
END;
$$;
