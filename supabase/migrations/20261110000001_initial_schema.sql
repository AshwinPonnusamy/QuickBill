-- QuickBill Database Schema & RLS Policies
-- Compatible with PostgreSQL 15+ and Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'grocery', 'bakery', 'tea_shop', 'clothing', 'supermarket', 'retail', 'other')),
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    logo_url TEXT,
    is_gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    gstin TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    invoice_prefix TEXT NOT NULL DEFAULT 'QB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BUSINESS MEMBERS
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    selling_price_paise BIGINT NOT NULL,
    purchase_price_paise BIGINT,
    unit TEXT NOT NULL DEFAULT 'item' CHECK (unit IN ('item', 'kg', 'g', 'liter', 'ml', 'meter', 'packet', 'box', 'plate', 'cup')),
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    stock_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(10,3) NOT NULL DEFAULT 5,
    image_url TEXT,
    is_favourite BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    outstanding_balance_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    local_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal_paise BIGINT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'fixed', 'percentage')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_paise BIGINT NOT NULL DEFAULT 0,
    cgst_paise BIGINT NOT NULL DEFAULT 0,
    sgst_paise BIGINT NOT NULL DEFAULT 0,
    igst_paise BIGINT NOT NULL DEFAULT 0,
    total_tax_paise BIGINT NOT NULL DEFAULT 0,
    grand_total_paise BIGINT NOT NULL,
    paid_amount_paise BIGINT NOT NULL DEFAULT 0,
    balance_amount_paise BIGINT NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'void')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'credit', 'split')),
    notes TEXT,
    is_void BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, financial_year, invoice_number)
);

-- 8. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit_price_paise BIGINT NOT NULL,
    subtotal_paise BIGINT NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cgst_paise BIGINT NOT NULL DEFAULT 0,
    sgst_paise BIGINT NOT NULL DEFAULT 0,
    igst_paise BIGINT NOT NULL DEFAULT 0,
    tax_paise BIGINT NOT NULL DEFAULT 0,
    discount_paise BIGINT NOT NULL DEFAULT 0,
    total_paise BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'credit')),
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
    local_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'return', 'adjustment', 'initial')),
    quantity NUMERIC(10,3) NOT NULL,
    previous_stock NUMERIC(10,3) NOT NULL,
    new_stock NUMERIC(10,3) NOT NULL,
    reason TEXT,
    reference_id UUID,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trialing', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    max_staff INT NOT NULL DEFAULT 1,
    cloud_backup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    advanced_reports_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check User Business Membership
CREATE OR REPLACE FUNCTION public.check_user_business_role(p_business_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(p_roles)
  );
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view and update own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- BUSINESSES POLICIES
CREATE POLICY "Members can view their business"
    ON public.businesses FOR SELECT
    USING (check_user_business_role(id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Owners and admins can update business"
    ON public.businesses FOR UPDATE
    USING (check_user_business_role(id, ARRAY['owner', 'admin']));

CREATE POLICY "Authenticated users can create business"
    ON public.businesses FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- BUSINESS MEMBERS POLICIES
CREATE POLICY "Members can view staff in business"
    ON public.business_members FOR SELECT
    USING (business_id IN (
        SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid() AND bm.status = 'active'
    ));

CREATE POLICY "Admins and owners can manage members"
    ON public.business_members FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- CATEGORIES POLICIES
CREATE POLICY "Members can read categories"
    ON public.categories FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Members can insert/update categories"
    ON public.categories FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- PRODUCTS POLICIES
CREATE POLICY "Members can read products"
    ON public.products FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Staff can update stock / admins can manage products"
    ON public.products FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

-- CUSTOMERS POLICIES
CREATE POLICY "Members can view customers"
    ON public.customers FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Members can insert/update customers"
    ON public.customers FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

-- INVOICES POLICIES
CREATE POLICY "Members can view invoices"
    ON public.invoices FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Members can insert invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Only admins/owners can void or edit invoices"
    ON public.invoices FOR UPDATE
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- INVOICE ITEMS POLICIES
CREATE POLICY "Members can view invoice items"
    ON public.invoice_items FOR SELECT
    USING (invoice_id IN (
        SELECT i.id FROM public.invoices i WHERE check_user_business_role(i.business_id, ARRAY['owner', 'admin', 'staff'])
    ));

CREATE POLICY "Members can insert invoice items"
    ON public.invoice_items FOR INSERT
    WITH CHECK (invoice_id IN (
        SELECT i.id FROM public.invoices i WHERE check_user_business_role(i.business_id, ARRAY['owner', 'admin', 'staff'])
    ));

-- PAYMENTS POLICIES
CREATE POLICY "Members can view and record payments"
    ON public.payments FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

-- STOCK MOVEMENTS POLICIES
CREATE POLICY "Members can view and log stock movements"
    ON public.stock_movements FOR ALL
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

-- SUBSCRIPTIONS POLICIES
CREATE POLICY "Members can view subscription"
    ON public.subscriptions FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

-- AUDIT LOGS POLICIES
CREATE POLICY "Owners and admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (check_user_business_role(business_id, ARRAY['owner', 'admin']));

-- ATOMIC INVOICE CREATION FUNCTION (Server-side RPC for consistency & stock adjustment)
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
AS $$
DECLARE
    v_invoice_id UUID;
    v_item RECORD;
    v_payment RECORD;
    v_current_stock NUMERIC;
BEGIN
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

        -- If product is tracked, decrement stock and log movement
        IF v_item.product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_current_stock FROM public.products WHERE id = v_item.product_id FOR UPDATE;
            IF FOUND THEN
                UPDATE public.products 
                SET stock_quantity = stock_quantity - v_item.quantity, updated_at = NOW()
                WHERE id = v_item.product_id;

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
        WHERE id = p_customer_id;
    END IF;

    RETURN v_invoice_id;
END;
$$;

