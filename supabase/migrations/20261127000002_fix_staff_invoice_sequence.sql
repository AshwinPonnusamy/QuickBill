-- =============================================================================
-- QuickBill: Fix Staff Invoice Numbering Collision Under RLS
-- Migration: 20261127000002_fix_staff_invoice_sequence.sql
--
-- Root Cause:
--   Staff RLS on public.invoices restricts SELECT to `created_by = auth.uid()`.
--   Client-side getNextInvoiceSeq() queried `public.invoices` directly, so
--   staff users could not see invoices created by owners/admins/other staff,
--   causing invoice_number collisions on `invoices_business_id_financial_year_invoice_number_key`.
--
-- Fix:
--   Provide a SECURITY DEFINER RPC `get_next_invoice_seq` that checks active
--   business membership (owner/admin/staff) and computes MAX(trailing seq) + 1
--   across the entire business for the financial year.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_invoice_seq(
    p_business_id UUID,
    p_financial_year TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_seq BIGINT;
BEGIN
    IF NOT public.check_user_business_role(p_business_id, ARRAY['owner', 'admin', 'staff']) THEN
        RAISE EXCEPTION 'Not permitted: user is not an active member of this business';
    END IF;

    SELECT COALESCE(
        MAX(NULLIF(substring(invoice_number FROM '([0-9]+)$'), '')::BIGINT),
        0
    )
    INTO v_max_seq
    FROM public.invoices
    WHERE business_id = p_business_id
      AND financial_year = p_financial_year;

    RETURN COALESCE(v_max_seq, 0) + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_invoice_seq(UUID, TEXT) TO authenticated;
