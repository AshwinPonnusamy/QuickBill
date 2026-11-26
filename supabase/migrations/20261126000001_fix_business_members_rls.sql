-- Fix recursive RLS policy on business_members and allow business owners to update their business directly

DROP POLICY IF EXISTS "Members can view staff in business" ON public.business_members;
CREATE POLICY "Members can view staff in business"
    ON public.business_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.check_user_business_role(business_id, ARRAY['owner', 'admin', 'staff'])
    );

DROP POLICY IF EXISTS "Owners and admins can update business" ON public.businesses;
CREATE POLICY "Owners and admins can update business"
    ON public.businesses FOR UPDATE
    USING (
        auth.uid() = owner_id
        OR public.check_user_business_role(id, ARRAY['owner', 'admin'])
    );
