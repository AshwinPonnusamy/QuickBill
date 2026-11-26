const mockAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signInWithOtp: jest.fn(),
  verifyOtp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
};
const mockFrom = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: mockAuth,
    from: (...args: any[]) => mockFrom(...args),
    functions: { invoke: (...args: any[]) => mockFunctionsInvoke(...args) },
  },
}));

import { authService } from '../services/auth.service';
import { staffService } from '../services/staff.service';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';

describe('authService & staffService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout();
    useBusinessStore.getState().setRole('owner');
  });

  test('authService signIn, signUp, sendOtp, verifyOtp, resetPassword, updateLanguage, signOut', async () => {
    const profileRow = {
      id: 'u1',
      full_name: 'Ashwin',
      phone: '9876543210',
      preferred_language: 'en',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: profileRow, error: null }),
      single: jest.fn().mockResolvedValue({ data: profileRow, error: null }),
    });

    // Rejects short mobile numbers
    const badPhone = await authService.signIn('12345', 'secret');
    expect(badPhone.error).toContain('valid email');

    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'u1', user_metadata: { full_name: 'Ashwin' } } },
      error: null,
    });
    const okLogin = await authService.signIn('9876543210', 'secret123');
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: '9876543210@quickbill.app',
      password: 'secret123',
    });
    expect(okLogin.profile?.fullName).toBe('Ashwin');

    mockAuth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    });
    const okSignup = await authService.signUp('shop@test.com', 'secret123', 'Shop Owner');
    expect(okSignup.user?.id).toBe('u1');

    mockAuth.signInWithOtp.mockResolvedValueOnce({ error: null });
    expect(await authService.sendOtp('9876543210')).toEqual({ success: true });

    mockAuth.verifyOtp.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null });
    expect((await authService.verifyOtp('9876543210', '123456')).user?.id).toBe('u1');

    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    expect(await authService.resetPassword('shop@test.com')).toEqual({ success: true });

    expect((await authService.getProfile('u1'))?.fullName).toBe('Ashwin');
    mockAuth.signOut.mockResolvedValueOnce({ error: null });
    await authService.signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();

    // authStore actions
    useAuthStore.getState().setAuth({ id: 'u1' }, {
      id: 'u1',
      fullName: 'Ashwin',
      preferredLanguage: 'en',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    useAuthStore.getState().setHydrated(true);
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  test('staffService listStaff, createStaff, setStaffStatus, resetStaffPassword, removeStaff', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockResolvedValue({ error: null }),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'm1',
            business_id: 'biz-1',
            user_id: 'staff-1',
            role: 'staff',
            status: 'active',
            created_at: '2026-01-01',
            profiles: {
              id: 'staff-1',
              full_name: 'Karthik',
              phone: '9876500001',
              preferred_language: 'en',
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
            },
          },
        ],
        error: null,
      }),
    });

    const listRes = await staffService.listStaff('biz-1');
    expect(listRes.staff).toHaveLength(1);
    expect(listRes.staff[0].profile?.fullName).toBe('Karthik');

    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-owner' } } });
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { userId: 'staff-2' }, error: null });

    const created = await staffService.createStaff('biz-1', {
      fullName: 'Meena',
      phone: '9876500002',
      password: 'password123',
    });
    expect(created).toEqual({ success: true, userId: 'staff-2' });

    // Error extraction on 404 Edge Function
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { context: { status: 404, text: async () => '{"message":"Requested function was not found"}' } },
    });
    const notFound = await staffService.createStaff('biz-1', {
      fullName: 'Meena',
      phone: '9876500002',
      password: 'password123',
    });
    expect(notFound.success).toBe(false);
    expect(notFound.error).toContain('Requested function was not found');

    expect(await staffService.setStaffStatus('biz-1', 'm1', 'suspended')).toEqual({ success: true });

    mockFunctionsInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });
    expect(await staffService.resetStaffPassword('biz-1', 'staff-1', 'newpass123')).toEqual({ success: true });

    mockFunctionsInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });
    expect(await staffService.removeStaff('biz-1', 'm1')).toEqual({ success: true });

    // Staff role cannot manage staff
    useBusinessStore.getState().setRole('staff');
    expect(await staffService.listStaff('biz-1')).toEqual({ staff: [], error: 'Not permitted' });
  });

  test('covers error branches and sessionGuard suspended-staff forced logout', async () => {
    // authService.ensureProfile upsert when profile not found
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'u2',
          full_name: 'New User',
          phone: '9111111111',
          preferred_language: 'en',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      }),
    });
    const ensured = await authService.ensureProfile({ id: 'u2', email: '9111111111@quickbill.app' }, 'New User');
    expect(ensured?.fullName).toBe('New User');

    mockAuth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid login' } });
    expect((await authService.signIn('test@shop.com', 'wrong')).error).toBe('Invalid login');

    mockAuth.signUp.mockResolvedValueOnce({ data: { user: { id: 'u3' }, session: null }, error: null });
    expect((await authService.signUp('test@shop.com', 'pass123', 'Test')).error).toContain('confirm your account');

    mockAuth.signInWithOtp.mockResolvedValueOnce({ error: { message: 'SMS disabled' } });
    expect(await authService.sendOtp('9876543210')).toEqual({ success: false, error: 'SMS disabled' });

    mockAuth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid code' } });
    expect((await authService.verifyOtp('9876543210', '000000')).error).toBe('Invalid code');

    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'User missing' } });
    expect(await authService.resetPassword('x@y.com')).toEqual({ success: false, error: 'User missing' });

    // staffService validation + error extraction branches
    useBusinessStore.getState().setRole('owner');
    expect(await staffService.createStaff('biz-1', { fullName: '', phone: '9876543210', password: 'secret' })).toEqual({
      success: false,
      error: 'Please enter the staff member name.',
    });
    expect(await staffService.createStaff('biz-1', { fullName: 'A', phone: '123', password: 'secret' })).toEqual({
      success: false,
      error: 'Please enter a valid 10-digit mobile number.',
    });
    expect(await staffService.createStaff('biz-1', { fullName: 'A', phone: '9876543210', password: '123' })).toEqual({
      success: false,
      error: 'Password must be at least 6 characters.',
    });
    expect(await staffService.resetStaffPassword('biz-1', 's1', '12')).toEqual({
      success: false,
      error: 'Password must be at least 6 characters.',
    });

    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });
    expect((await staffService.createStaff('biz-1', { fullName: 'A', phone: '9876543210', password: 'secret' })).error).toContain('expired');

    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { context: { status: 401, text: async () => '{"error":"Invalid JWT"}' } },
    });
    expect((await staffService.resetStaffPassword('biz-1', 's1', 'secret123')).error).toContain('verify_jwt = false');

    mockFunctionsInvoke.mockRejectedValueOnce(new Error('network down'));
    expect((await staffService.removeStaff('biz-1', 'm1')).error).toBe('network down');

    // sessionGuard forced logout when staff is suspended
    const { checkAndLogoutIfSuspended } = require('../services/sessionGuard');
    useAuthStore.getState().setAuth({ id: 'staff-1' }, null);
    useBusinessStore.getState().setBusiness({
      id: 'biz-1',
      ownerId: 'owner-1',
      name: 'Shop',
      businessType: 'retail',
      ownerName: 'Owner',
      phone: '9999999999',
      address: 'Addr',
      isGstRegistered: false,
      currency: 'INR',
      taxInclusive: true,
      defaultTaxRate: 5,
      invoicePrefix: 'QB',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { status: 'suspended' } }),
    });
    mockAuth.signOut.mockResolvedValueOnce({ error: null });
    const loggedOut = await checkAndLogoutIfSuspended('Not permitted');
    expect(loggedOut).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
