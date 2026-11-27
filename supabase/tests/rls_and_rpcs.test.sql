-- =============================================================================
-- QuickBill SQL Security & Integrity Tests (Transactional – always rolled back)
-- Extended version: 20261127000001_production_hardening.sql applied.
--
-- Run via Supabase SQL Editor or psql:
--   \i supabase/tests/rls_and_rpcs.test.sql
--
-- All changes wrapped in a BEGIN...ROLLBACK so the database remains clean.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_owner_id UUID := '11111111-1111-1111-1111-111111111111';
  v_admin_id UUID := '44444444-4444-4444-4444-444444444444';
  v_staff_id UUID := '22222222-2222-2222-2222-222222222222';
  v_outsider_id UUID := '33333333-3333-3333-3333-333333333333';
  v_business_id UUID;
  v_other_biz_id UUID;
  v_product_id UUID;
  v_other_product_id UUID;
  v_customer_id UUID;
  v_other_customer_id UUID;
  v_invoice_1 UUID;
  v_invoice_2 UUID;
  v_stock NUMERIC;
  v_balance BIGINT;
  v_payment_count INT;
  v_audit_count INT;
  v_caught BOOLEAN;
BEGIN
  -- =========================================================================
  -- SETUP: synthetic users, businesses, memberships, products, customers
  -- =========================================================================
  INSERT INTO auth.users (id, email)
  VALUES
    (v_owner_id, 'owner-test@quickbill.app'),
    (v_admin_id, 'admin-test@quickbill.app'),
    (v_staff_id, 'staff-test@quickbill.app'),
    (v_outsider_id, 'outsider-test@quickbill.app')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES
    (v_owner_id, 'Test Owner', '9000000001'),
    (v_admin_id, 'Test Admin', '9000000004'),
    (v_staff_id, 'Test Staff', '9000000002'),
    (v_outsider_id, 'Outsider', '9000000003')
  ON CONFLICT (id) DO NOTHING;

  -- Business 1 (owner + admin + staff belong here)
  INSERT INTO public.businesses (owner_id, name, business_type, owner_name, phone, address)
  VALUES (v_owner_id, 'Test Retail Shop', 'retail', 'Test Owner', '9000000001', 'Test Address')
  RETURNING id INTO v_business_id;

  -- Business 2 (outsider's business – for cross-tenant tests)
  INSERT INTO public.businesses (owner_id, name, business_type, owner_name, phone, address)
  VALUES (v_outsider_id, 'Other Shop', 'grocery', 'Outsider', '9000000003', 'Other Addr')
  RETURNING id INTO v_other_biz_id;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES
    (v_business_id, v_owner_id, 'owner', 'active'),
    (v_business_id, v_admin_id, 'admin', 'active'),
    (v_business_id, v_staff_id, 'staff', 'active'),
    (v_other_biz_id, v_outsider_id, 'owner', 'active');

  -- Product in business 1
  INSERT INTO public.products (business_id, name, selling_price_paise, purchase_price_paise, stock_quantity)
  VALUES (v_business_id, 'Test Sugar', 5000, 3000, 20)
  RETURNING id INTO v_product_id;

  -- Product in business 2 (cross-tenant attack target)
  INSERT INTO public.products (business_id, name, selling_price_paise, stock_quantity)
  VALUES (v_other_biz_id, 'Other Product', 10000, 5)
  RETURNING id INTO v_other_product_id;

  -- Customer in business 1
  INSERT INTO public.customers (business_id, name, outstanding_balance_paise)
  VALUES (v_business_id, 'Test Customer', 5000)
  RETURNING id INTO v_customer_id;

  -- Customer in business 2 (cross-tenant attack target)
  INSERT INTO public.customers (business_id, name, outstanding_balance_paise)
  VALUES (v_other_biz_id, 'Other Customer', 0)
  RETURNING id INTO v_other_customer_id;

  -- =========================================================================
  -- TEST 1: Non-member rejected by adjust_stock, settle_customer_udhar, create_invoice_atomic
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_outsider_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.adjust_stock(v_business_id, v_product_id, 'purchase', 5, 'Hack');
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 1a FAIL: adjust_stock allowed a non-member'; END IF;

  v_caught := FALSE;
  BEGIN
    PERFORM public.settle_customer_udhar(v_business_id, v_customer_id, 1000, 'cash');
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 1b FAIL: settle_customer_udhar allowed a non-member'; END IF;

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
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 1c FAIL: create_invoice_atomic allowed a non-member'; END IF;

  RAISE NOTICE 'TEST 1 PASSED: Non-member correctly rejected by all RPCs';

  -- =========================================================================
  -- TEST 2: Staff rejected by adjust_stock and settle_customer_udhar
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_staff_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.adjust_stock(v_business_id, v_product_id, 'purchase', 5, 'Staff hack');
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 2a FAIL: adjust_stock allowed staff'; END IF;

  v_caught := FALSE;
  BEGIN
    PERFORM public.settle_customer_udhar(v_business_id, v_customer_id, 500, 'cash');
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 2b FAIL: settle_customer_udhar allowed staff'; END IF;

  RAISE NOTICE 'TEST 2 PASSED: Staff correctly rejected by adjust_stock and settle_customer_udhar';

  -- =========================================================================
  -- TEST 3: Staff CANNOT apply discounts via create_invoice_atomic
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_staff_id::TEXT, TRUE);

  -- Staff tries percentage discount
  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-9002', '2026-2027', 'loc-disc-hack',
      'Walk-in', NULL, 5000, 'percentage', 10, 500, 0, 0, 0, 0, 4500, 4500, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 500, 'total_paise', 4500
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 4500, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-disc'
      ))
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 3a FAIL: staff was able to apply percentage discount'; END IF;

  -- Staff tries fixed discount (non-zero discount_paise)
  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-9003', '2026-2027', 'loc-disc-hack2',
      'Walk-in', NULL, 5000, 'none', 0, 100, 0, 0, 0, 0, 4900, 4900, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 100, 'total_paise', 4900
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 4900, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-disc2'
      ))
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 3b FAIL: staff was able to apply fixed discount via discount_paise'; END IF;

  RAISE NOTICE 'TEST 3 PASSED: Staff discount bypass correctly blocked in create_invoice_atomic';

  -- =========================================================================
  -- TEST 4: Cross-tenant product validation
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    -- Try to bill with a product from other_business
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-9004', '2026-2027', 'loc-xprod',
      'Walk-in', NULL, 10000, 'none', 0, 0, 0, 0, 0, 0, 10000, 10000, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_other_product_id, 'product_name', 'Other Product',
        'unit', 'item', 'quantity', 1, 'unit_price_paise', 10000,
        'subtotal_paise', 10000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 10000
      )),
      '[]'::JSONB
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 4a FAIL: cross-business product_id was accepted'; END IF;

  RAISE NOTICE 'TEST 4a PASSED: Cross-tenant product_id correctly rejected';

  -- =========================================================================
  -- TEST 5: Cross-tenant customer validation
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    -- Try to assign an invoice to a customer from other business
    PERFORM public.create_invoice_atomic(
      v_business_id, v_other_customer_id, 'QB-2627-9005', '2026-2027', 'loc-xcust',
      'Other Customer', NULL, 5000, 'none', 0, 0, 0, 0, 0, 0, 5000, 5000, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 5000
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 5000, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-xcust'
      ))
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 5 FAIL: cross-business customer_id was accepted'; END IF;

  RAISE NOTICE 'TEST 5 PASSED: Cross-tenant customer_id correctly rejected';

  -- =========================================================================
  -- TEST 6: Invalid quantity rejected
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-9006', '2026-2027', 'loc-qty0',
      'Walk-in', NULL, 0, 'none', 0, 0, 0, 0, 0, 0, 0, 0, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', -1, 'unit_price_paise', 5000,
        'subtotal_paise', 0, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 0
      )),
      '[]'::JSONB
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 6 FAIL: negative quantity was accepted'; END IF;

  RAISE NOTICE 'TEST 6 PASSED: Negative quantity correctly rejected';

  -- =========================================================================
  -- TEST 7: Idempotent retry of create_invoice_atomic decrements stock ONCE
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

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

  -- Retry with same local_id (network retry simulation)
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
    RAISE EXCEPTION 'TEST 7a FAIL: Idempotent retry returned different invoice IDs';
  END IF;

  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = v_product_id;
  IF v_stock <> 17 THEN
    RAISE EXCEPTION 'TEST 7b FAIL: Expected stock 17 after idempotent retry, got %', v_stock;
  END IF;

  RAISE NOTICE 'TEST 7 PASSED: Idempotent retry returns same invoice and decrements stock exactly once';

  -- =========================================================================
  -- TEST 8: Duplicate invoice_number with different local_id raises 23505
  -- =========================================================================
  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-0001', '2026-2027', 'loc-device-2',
      'Walk-in Customer', NULL, 5000, 'none', 0, 0, 0, 0, 0, 0, 5000, 5000, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 5000
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 5000, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-dup-2'
      ))
    );
  EXCEPTION WHEN unique_violation THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'TEST 8 FAIL: Duplicate invoice_number did not raise unique_violation';
  END IF;

  RAISE NOTICE 'TEST 8 PASSED: Duplicate invoice_number correctly raises 23505';

  -- =========================================================================
  -- TEST 9: Owner settle_customer_udhar lowers balance and logs payment+audit
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);
  v_balance := public.settle_customer_udhar(v_business_id, v_customer_id, 2000, 'upi');

  IF v_balance <> 3000 THEN
    RAISE EXCEPTION 'TEST 9a FAIL: Expected balance 3000, got %', v_balance;
  END IF;

  SELECT COUNT(*) INTO v_payment_count
  FROM public.payments
  WHERE customer_id = v_customer_id AND payment_method = 'upi' AND amount_paise = 2000;

  SELECT COUNT(*) INTO v_audit_count
  FROM public.audit_logs
  WHERE business_id = v_business_id AND action = 'settle_udhar' AND entity_id = v_customer_id::TEXT;

  IF v_payment_count <> 1 OR v_audit_count <> 1 THEN
    RAISE EXCEPTION 'TEST 9b FAIL: settle_udhar did not log payment (%) or audit (%)', v_payment_count, v_audit_count;
  END IF;

  RAISE NOTICE 'TEST 9 PASSED: settle_customer_udhar correctly lowers balance and creates payment+audit records';

  -- =========================================================================
  -- TEST 10: Admin can apply discounts; staff cannot
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::TEXT, TRUE);

  -- Admin with discount (should succeed)
  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-0002', '2026-2027', 'loc-admin-disc',
      'Walk-in', NULL, 5000, 'percentage', 10, 500, 0, 0, 0, 0, 4500, 4500, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 500, 'total_paise', 4500
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 4500, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-adm-disc'
      ))
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF v_caught THEN RAISE EXCEPTION 'TEST 10 FAIL: Admin was rejected when applying a valid discount'; END IF;

  RAISE NOTICE 'TEST 10 PASSED: Admin can apply discounts; staff correctly blocked';

  -- =========================================================================
  -- TEST 11: Payment amount exceeding grand total is rejected
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.create_invoice_atomic(
      v_business_id, NULL, 'QB-2627-0010', '2026-2027', 'loc-overpay',
      'Walk-in', NULL, 5000, 'none', 0, 0, 0, 0, 0, 0, 5000, 10000, 0,
      'paid', 'cash', NULL,
      jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id, 'product_name', 'Test Sugar',
        'unit', 'kg', 'quantity', 1, 'unit_price_paise', 5000,
        'subtotal_paise', 5000, 'tax_rate', 0, 'cgst_paise', 0,
        'sgst_paise', 0, 'igst_paise', 0, 'tax_paise', 0,
        'discount_paise', 0, 'total_paise', 5000
      )),
      jsonb_build_array(jsonb_build_object(
        'amount_paise', 10000, 'payment_method', 'cash', 'status', 'completed', 'local_id', 'pay-over'
      ))
    );
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 11 FAIL: Payment exceeding grand total was accepted'; END IF;

  RAISE NOTICE 'TEST 11 PASSED: Payment exceeding grand total correctly rejected';

  -- =========================================================================
  -- TEST 12: Invoice creation audit log entry created
  -- =========================================================================
  SELECT COUNT(*) INTO v_audit_count
  FROM public.audit_logs
  WHERE business_id = v_business_id AND action = 'create_invoice';

  IF v_audit_count < 1 THEN
    RAISE EXCEPTION 'TEST 12 FAIL: No create_invoice audit log entries found';
  END IF;

  RAISE NOTICE 'TEST 12 PASSED: Invoice creation audit log entries exist';

  -- =========================================================================
  -- TEST 13: adjust_stock correctly validates movement_type
  -- =========================================================================
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::TEXT, TRUE);

  v_caught := FALSE;
  BEGIN
    PERFORM public.adjust_stock(v_business_id, v_product_id, 'sale', 1, 'invalid type');
  EXCEPTION WHEN OTHERS THEN v_caught := TRUE;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'TEST 13 FAIL: adjust_stock accepted invalid movement_type "sale"'; END IF;

  RAISE NOTICE 'TEST 13 PASSED: adjust_stock rejects invalid movement_type';

  RAISE NOTICE '================================================================';
  RAISE NOTICE 'ALL SQL SECURITY & INTEGRITY TESTS PASSED';
  RAISE NOTICE '================================================================';
END $$;

ROLLBACK;
