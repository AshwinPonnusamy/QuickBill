-- QuickBill SQL Verification Tests (Transactionally rolled back — safe on staging/local Postgres)
-- Prerequisites: migrations up to 20261126000003_performance.sql applied.
-- Run via Supabase SQL Editor or psql: \i supabase/tests/rls_and_rpcs.test.sql

BEGIN;

DO $$
DECLARE
  v_owner_id UUID := '11111111-1111-1111-1111-111111111111';
  v_staff_id UUID := '22222222-2222-2222-2222-222222222222';
  v_outsider_id UUID := '33333333-3333-3333-3333-333333333333';
  v_business_id UUID;
  v_product_id UUID;
  v_customer_id UUID;
  v_invoice_1 UUID;
  v_invoice_2 UUID;
  v_stock NUMERIC;
  v_balance BIGINT;
  v_payment_count INT;
  v_audit_count INT;
  v_caught BOOLEAN;
BEGIN
  -- Setup synthetic auth.users + profiles + business + membership + product + customer
  INSERT INTO auth.users (id, email)
  VALUES
    (v_owner_id, 'owner-test@quickbill.app'),
    (v_staff_id, 'staff-test@quickbill.app'),
    (v_outsider_id, 'outsider-test@quickbill.app')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES
    (v_owner_id, 'Test Owner', '9000000001'),
    (v_staff_id, 'Test Staff', '9000000002'),
    (v_outsider_id, 'Outsider', '9000000003')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.businesses (owner_id, name, business_type, owner_name, phone, address)
  VALUES (v_owner_id, 'Test Retail Shop', 'retail', 'Test Owner', '9000000001', 'Test Address')
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES
    (v_business_id, v_owner_id, 'owner', 'active'),
    (v_business_id, v_staff_id, 'staff', 'active');

  INSERT INTO public.products (business_id, name, selling_price_paise, stock_quantity)
  VALUES (v_business_id, 'Test Sugar', 5000, 20)
  RETURNING id INTO v_product_id;

  INSERT INTO public.customers (business_id, name, outstanding_balance_paise)
  VALUES (v_business_id, 'Test Customer', 5000)
  RETURNING id INTO v_customer_id;

  -- TEST 1: Non-member rejected by adjust_stock, settle_customer_udhar, and create_invoice_atomic
  PERFORM set_config('request.jwt.claim.sub', v_outsider_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.adjust_stock(v_business_id, v_product_id, 'purchase', 5, 'Hack');
  EXCEPTION WHEN OTHERS THEN
    v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: adjust_stock allowed a non-member';
  END IF;

  v_caught := FALSE;
  BEGIN
    PERFORM public.settle_customer_udhar(v_business_id, v_customer_id, 1000, 'cash');
  EXCEPTION WHEN OTHERS THEN
    v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: settle_customer_udhar allowed a non-member';
  END IF;

  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-9001', '2026-2027', 'loc-hack',
      'Walk-in', NULL, 5000, 'none', 0, 0, 0, 0, 0, 0, 5000, 5000, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 5000
      )),
      '[]'::JSONB
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: create_invoice_atomic allowed a non-member';
  END IF;

  -- TEST 2: Staff is rejected by adjust_stock and settle_customer_udhar
  PERFORM set_config('request.jwt.claim.sub', v_staff_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.adjust_stock(v_business_id, v_product_id, 'purchase', 5, 'Staff try');
  EXCEPTION WHEN OTHERS THEN
    v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: adjust_stock allowed staff user';
  END IF;

  -- TEST 3: Idempotent retry of create_invoice_atomic decrements stock EXACTLY ONCE
  v_invoice_1 := public.create_invoice_atomic(
    v_business_id, NULL, 'QB-2627-0001', '2026-2027', 'loc-idem-1',
    'Walk-in Customer', NULL, 15000, 'none', 0, 0, 0, 0, 0, 0, 15000, 15000, 0,
    'paid', 'cash', NULL,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id, 'product_name', 'Test Sugar',
      'unit', 'kg', 'quantity', 3, 'unit_price_paise', 5000,
      'subtotal_paise', 15000, 'tax_rate', 0, 'cgst_paise', 0,
      'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
      'discount_paise', 0, 'total_paise', 15000
    )),
    jsonb_build_array(jsonb_build_object(
      'amount_paise', 15000, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-1'
    ))
  );

  v_invoice_2 := public.create_invoice_atomic(
    v_business_id, NULL, 'QB-2627-0001', '2026-2027', 'loc-idem-1',
    'Walk-in Customer', NULL, 15000, 'none', 0, 0, 0, 0, 0, 0, 15000, 15000, 0,
    'paid', 'cash', NULL,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id, 'product_name', 'Test Sugar',
      'unit', 'kg', 'quantity', 3, 'unit_price_paise', 5000,
      'subtotal_paise', 15000, 'tax_rate', 0, 'cgst_paise', 0,
      'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
      'discount_paise', 0, 'total_paise', 15000
    )),
    jsonb_build_array(jsonb_build_object(
      'amount_paise', 15000, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-1'
    ))
  );

  IF v_invoice_1 <> v_invoice_2 THEN
    RAISE EXCEPTION 'FAIL: Idempotent retry returned different invoice IDs';
  END IF;

  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = v_product_id;
  IF v_stock <> 17 THEN
    RAISE EXCEPTION 'FAIL: Expected stock 17 after idempotent retry, got %', v_stock;
  END IF;

  -- TEST 4: Second device with different local_id & same invoice_number hits SQLSTATE 23505
  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-0001', '2026-2027', 'loc-device-2',
      'Walk-in Customer', NULL, 5000, 'none', 0, 0, 0, 0, 0, 0, 5000, 5000, 0,
      'paid', 'cash', NULL,
      '[]'::JSONB, '[]'::JSONB
    );
  EXCEPTION WHEN unique_violation THEN
    v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: Duplicate invoice_number did not raise 23505';
  END IF;

  -- TEST 5: Owner settle_customer_udhar lowers balance, records payment row, and logs audit row
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);
  v_balance := public.settle_customer_udhar(v_business_id, v_customer_id, 2000, 'upi');
  IF v_balance <> 3000 THEN
    RAISE EXCEPTION 'FAIL: Expected balance 3000, got %', v_balance;
  END IF;

  SELECT COUNT(*) INTO v_payment_count
  FROM public.payments
  WHERE customer_id = v_customer_id AND payment_method = 'upi' AND amount_paise = 2000;

  SELECT COUNT(*) INTO v_audit_count
  FROM public.audit_logs
  WHERE business_id = v_business_id AND action = 'settle_udhar' AND entity_id = v_customer_id::TEXT;

  IF v_payment_count <> 1 OR v_audit_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: settle_customer_udhar did not log payment (%) or audit (%)', v_payment_count, v_audit_count;
  END IF;

  RAISE NOTICE 'ALL SQL TESTS PASSED!';
END $$;

ROLLBACK;
