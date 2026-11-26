import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizePhoneDigits = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Server environment variables are not configured.' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return jsonResponse({ error: 'Missing Authorization token.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller JWT directly via Supabase Auth admin endpoint (works with legacy & ES256/publishable keys)
    const {
      data: { user: caller },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: authError?.message || 'Invalid or expired user session.' }, 401);
    }

    const body = await req.json();
    const action: string = body?.action || 'create';
    const businessId: string = body?.businessId;

    if (!businessId) {
      return jsonResponse({ error: 'businessId is required.' }, 400);
    }

    // Verify caller is the business owner OR an active owner/admin member
    const { data: bizRow, error: bizError } = await adminClient
      .from('businesses')
      .select('id, owner_id, owner_name, phone')
      .eq('id', businessId)
      .maybeSingle();

    if (bizError || !bizRow) {
      return jsonResponse({ error: 'Business not found.' }, 404);
    }

    let isAuthorized = bizRow.owner_id === caller.id;

    if (isAuthorized) {
      // Ensure the owner also has an active business_members row for RLS & seat counting
      const { data: ownerMember } = await adminClient
        .from('business_members')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', caller.id)
        .maybeSingle();

      if (!ownerMember) {
        await adminClient.from('business_members').insert({
          business_id: businessId,
          user_id: caller.id,
          role: 'owner',
          status: 'active',
        });
      }
    } else {
      const { data: callerMember } = await adminClient
        .from('business_members')
        .select('role, status')
        .eq('business_id', businessId)
        .eq('user_id', caller.id)
        .eq('status', 'active')
        .maybeSingle();

      isAuthorized = callerMember?.role === 'owner' || callerMember?.role === 'admin';
    }

    if (!isAuthorized) {
      return jsonResponse(
        { error: 'Not permitted. Only shop owners or admins can manage staff.' },
        403
      );
    }

    // Action 1: Reset a staff member's password
    if (action === 'reset-staff-password') {
      const targetUserId: string = body?.userId;
      const newPassword: string = typeof body?.password === 'string' ? body.password : '';

      if (!targetUserId) {
        return jsonResponse({ error: 'userId is required.' }, 400);
      }
      if (newPassword.length < 6) {
        return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
      }
      if (targetUserId === caller.id) {
        return jsonResponse({ error: 'Use forgot password to change your own password.' }, 400);
      }

      const { data: memberRow, error: memberLookupError } = await adminClient
        .from('business_members')
        .select('id, role')
        .eq('business_id', businessId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (memberLookupError || !memberRow) {
        return jsonResponse({ error: 'Staff member not found in this business.' }, 404);
      }
      if (memberRow.role === 'owner') {
        return jsonResponse(
          { error: 'Cannot reset the business owner password from staff manager.' },
          403
        );
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (updateErr) {
        return jsonResponse({ error: updateErr.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    // Action 2: Suspend or remove a staff member from this business
    if (action === 'remove-staff') {
      const memberId: string = body?.memberId;
      const mode: 'suspend' | 'delete' = body?.mode === 'suspend' ? 'suspend' : 'delete';

      if (!memberId) {
        return jsonResponse({ error: 'memberId is required.' }, 400);
      }

      const { data: memberRow, error: memberLookupError } = await adminClient
        .from('business_members')
        .select('id, user_id, role')
        .eq('id', memberId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (memberLookupError || !memberRow) {
        return jsonResponse({ error: 'Staff member not found in this business.' }, 404);
      }
      if (memberRow.role === 'owner' || memberRow.user_id === caller.id) {
        return jsonResponse({ error: 'Cannot remove or suspend the business owner.' }, 403);
      }

      if (mode === 'suspend') {
        const { error: suspendErr } = await adminClient
          .from('business_members')
          .update({ status: 'suspended' })
          .eq('id', memberId)
          .eq('business_id', businessId);

        if (suspendErr) {
          return jsonResponse({ error: suspendErr.message }, 400);
        }
        return jsonResponse({ success: true, status: 'suspended' });
      }

      const { error: deleteMemberErr } = await adminClient
        .from('business_members')
        .delete()
        .eq('id', memberId)
        .eq('business_id', businessId);

      if (deleteMemberErr) {
        return jsonResponse({ error: deleteMemberErr.message }, 400);
      }

      return jsonResponse({ success: true, status: 'removed' });
    }

    // Action 3 (default): Create a new staff login and add to business_members
    const fullName: string = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const rawPhone: string = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const password: string = typeof body?.password === 'string' ? body.password : '';
    const digits = normalizePhoneDigits(rawPhone);

    if (!fullName) {
      return jsonResponse({ error: 'Staff full name is required.' }, 400);
    }
    if (digits.length < 10) {
      return jsonResponse({ error: 'Please enter a valid 10-digit mobile number.' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
    }

    // Enforce plan staff limit (max_staff includes the owner; free plan = 1)
    const { data: subRow } = await adminClient
      .from('subscriptions')
      .select('max_staff')
      .eq('business_id', businessId)
      .maybeSingle();

    const maxStaff = Number(subRow?.max_staff ?? 1);

    const { count: activeMemberCount, error: countError } = await adminClient
      .from('business_members')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .neq('status', 'suspended');

    if (countError) {
      return jsonResponse({ error: countError.message }, 500);
    }

    if ((activeMemberCount ?? 0) >= maxStaff) {
      return jsonResponse({ error: 'Staff limit reached. Upgrade your plan.' }, 403);
    }

    const syntheticEmail = `${digits}@quickbill.app`;

    const { data: createdAuth, error: createUserError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: digits,
      },
    });

    if (createUserError || !createdAuth?.user) {
      const msg = createUserError?.message || 'Could not create staff login.';
      const isDuplicate =
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('exists') ||
        msg.toLowerCase().includes('registered');
      return jsonResponse(
        {
          error: isDuplicate
            ? 'This mobile number is already registered to an existing user or owner account.'
            : msg,
        },
        isDuplicate ? 409 : 400
      );
    }

    const newUserId = createdAuth.user.id;

    // Upsert profile then insert business_members; roll back auth user if either fails
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: newUserId,
        full_name: fullName,
        phone: digits,
        preferred_language: 'en',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: `Failed to initialize staff profile: ${profileError.message}` }, 500);
    }

    const { error: memberInsertError } = await adminClient.from('business_members').insert({
      business_id: businessId,
      user_id: newUserId,
      role: 'staff',
      status: 'active',
    });

    if (memberInsertError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: `Failed to link staff to business: ${memberInsertError.message}` }, 500);
    }

    return jsonResponse({ userId: newUserId }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return jsonResponse({ error: message }, 500);
  }
});
