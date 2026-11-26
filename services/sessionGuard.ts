import { Alert } from 'react-native';
import { supabase } from './supabase';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useProductStore } from '../store/product.store';
import { useBillStore } from '../store/bill.store';

let isHandlingSuspension = false;

/**
 * Forces local sign-out when a staff member's access is suspended or removed while logged in.
 */
export async function forceLogoutSuspendedUser(
  message = 'Your staff account has been suspended or removed by the shop owner.'
): Promise<void> {
  if (isHandlingSuspension) return;
  isHandlingSuspension = true;

  try {
    await supabase.auth.signOut().catch(() => undefined);
    useAuthStore.getState().logout();
    useBusinessStore.getState().resetBusinessSession();
    useProductStore.getState().setProducts([]);
    useProductStore.getState().setCategories([]);
    useBillStore.getState().clearBill();
    Alert.alert('Access Revoked', message);
  } finally {
    setTimeout(() => {
      isHandlingSuspension = false;
    }, 1500);
  }
}

/**
 * Verifies active membership when an RLS/membership failure occurs during an authenticated request.
 * Returns true if the user was suspended/removed and logged out.
 */
export async function checkAndLogoutIfSuspended(errorMessage?: string): Promise<boolean> {
  const { user } = useAuthStore.getState();
  const { business } = useBusinessStore.getState();
  if (!user?.id || !business?.id) return false;
  if (business.ownerId === user.id) return false;

  const lower = (errorMessage || '').toLowerCase();
  const looksLikeAccessError =
    !errorMessage ||
    lower.includes('not permitted') ||
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not an active member');

  if (!looksLikeAccessError) return false;

  try {
    const { data: member } = await supabase
      .from('business_members')
      .select('status')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member || member.status !== 'active') {
      await forceLogoutSuspendedUser();
      return true;
    }
  } catch {
    // Ignore transient network errors here
  }

  return false;
}
