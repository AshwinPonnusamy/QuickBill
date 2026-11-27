-- =============================================================================
-- QuickBill: Add Pro Business Plan & Set Plan Seat Limits
-- Migration: 20261127000004_add_pro_business_plan.sql
--
-- Plan Tiers & Seat Limits:
--   - free         : 1 seat (owner only)
--   - starter      : 5 seats
--   - pro          : 15 seats
--   - pro_business : -1 (unlimited seats)
-- =============================================================================

ALTER TABLE public.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('free', 'starter', 'pro', 'pro_business'));

-- Ensure seat-limit enforcement treats negative max_staff (-1) as unlimited
CREATE OR REPLACE FUNCTION public.enforce_subscription_seat_limit(
    p_business_id UUID,
    p_allowed_seats INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_effective_limit INT;
    v_owner_id UUID;
    v_non_owner_limit INT;
    v_suspended_ids UUID[];
BEGIN
    IF p_allowed_seats IS NOT NULL AND p_allowed_seats < 0 THEN
        -- Unlimited seats (-1): never auto-suspend
        RETURN;
    END IF;

    v_effective_limit := GREATEST(1, COALESCE(p_allowed_seats, 1));

    SELECT owner_id INTO v_owner_id
    FROM public.businesses
    WHERE id = p_business_id;

    v_non_owner_limit := GREATEST(0, v_effective_limit - 1);

    WITH ranked_staff AS (
        SELECT
            bm.id,
            ROW_NUMBER() OVER (ORDER BY bm.created_at ASC, bm.id ASC) AS rn
        FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.status = 'active'
          AND bm.role <> 'owner'
          AND (v_owner_id IS NULL OR bm.user_id <> v_owner_id)
    ),
    to_suspend AS (
        SELECT id
        FROM ranked_staff
        WHERE rn > v_non_owner_limit
    ),
    updated AS (
        UPDATE public.business_members bm
        SET status = 'suspended'
        FROM to_suspend ts
        WHERE bm.id = ts.id
        RETURNING bm.id
    )
    SELECT ARRAY_AGG(id) INTO v_suspended_ids FROM updated;

    IF v_suspended_ids IS NOT NULL AND array_length(v_suspended_ids, 1) > 0 THEN
        INSERT INTO public.audit_logs (
            business_id, user_id, action, entity_type, entity_id, details
        ) VALUES (
            p_business_id,
            COALESCE((SELECT auth.uid()), v_owner_id),
            'auto_suspend_seat_limit',
            'subscription',
            p_business_id::TEXT,
            jsonb_build_object(
                'allowed_seats', v_effective_limit,
                'suspended_member_ids', to_jsonb(v_suspended_ids)
            )
        );
    END IF;
END;
$$;

-- Upgrade existing active subscriptions to the new limits
UPDATE public.subscriptions
SET max_staff = 5,
    updated_at = NOW()
WHERE plan = 'starter'
  AND status = 'active'
  AND max_staff < 5;

UPDATE public.subscriptions
SET max_staff = 15,
    updated_at = NOW()
WHERE plan = 'pro'
  AND status = 'active'
  AND max_staff < 15;

UPDATE public.subscriptions
SET max_staff = -1,
    updated_at = NOW()
WHERE plan = 'pro_business'
  AND status = 'active';
