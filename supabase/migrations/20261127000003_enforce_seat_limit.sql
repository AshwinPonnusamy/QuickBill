-- =============================================================================
-- QuickBill: Automatic Plan Seat-Limit Enforcement on Downgrade / Expiry
-- Migration: 20261127000003_enforce_seat_limit.sql
--
-- Problem:
--   If a business upgrades to Pro (5 seats), adds 4 staff (+1 owner = 5), and
--   later downgrades to Starter (2 seats) or expires to Free (1 seat) without
--   manually suspending/removing extra staff, active seats would exceed max_staff
--   (e.g. 5/2) and extra staff could continue billing.
--
-- Fix:
--   Enforce seat limits in PostgreSQL whenever a subscription's effective
--   max_staff decreases or becomes inactive: automatically suspend the newest
--   non-owner active members beyond the allowed seat count and log to audit_logs.
-- =============================================================================

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
    v_effective_limit INT := GREATEST(1, COALESCE(p_allowed_seats, 1));
    v_owner_id UUID;
    v_non_owner_limit INT;
    v_suspended_ids UUID[];
BEGIN
    SELECT owner_id INTO v_owner_id
    FROM public.businesses
    WHERE id = p_business_id;

    -- Owner always retains 1 seat; remaining seats go to oldest active non-owner members
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

CREATE OR REPLACE FUNCTION public.trg_enforce_subscription_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed INT;
BEGIN
    IF NEW.status = 'active' AND (NEW.expires_at IS NULL OR NEW.expires_at > NOW()) THEN
        v_allowed := COALESCE(NEW.max_staff, 1);
    ELSE
        v_allowed := 1;
    END IF;

    PERFORM public.enforce_subscription_seat_limit(NEW.business_id, v_allowed);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_enforce_seat_limit ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_enforce_seat_limit
    AFTER INSERT OR UPDATE OF max_staff, status, plan, expires_at
    ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_subscription_seat_limit();

-- One-time cleanup for any existing businesses currently over their seat limit
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            s.business_id,
            CASE
                WHEN s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
                THEN COALESCE(s.max_staff, 1)
                ELSE 1
            END AS allowed_seats
        FROM public.subscriptions s
    LOOP
        PERFORM public.enforce_subscription_seat_limit(r.business_id, r.allowed_seats);
    END LOOP;
END $$;
