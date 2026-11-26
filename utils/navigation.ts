import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { can } from './permissions';

type AppRouter = Pick<ReturnType<typeof useRouter>, 'canGoBack' | 'back' | 'replace'>;

export function getDefaultHomeRoute(): string {
  const { isAuthenticated } = useAuthStore.getState();
  const { business, role } = useBusinessStore.getState();

  if (!isAuthenticated) {
    return '/(auth)/login';
  }
  if (!business) {
    return '/business-setup';
  }
  return can(role, 'view_reports') ? '/(tabs)' : '/(tabs)/new-bill';
}

/**
 * Safely navigates back if a back stack exists; otherwise replaces with a valid fallback route
 * so Expo Router never throws "The action 'GO_BACK' was not handled by any navigator".
 */
export function safeGoBack(router: AppRouter, fallbackRoute?: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace((fallbackRoute || getDefaultHomeRoute()) as any);
}
