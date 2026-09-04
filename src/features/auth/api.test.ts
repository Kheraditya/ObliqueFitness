jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { signUp, signIn, signOut, getCurrentUserProfile, redeemInviteCode } from './api';

describe('signUp', () => {
  it('returns no error on success', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: null });
    const result = await signUp('a@b.com', 'password123');
    expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on failure', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: { message: 'Email already in use' } });
    const result = await signUp('a@b.com', 'password123');
    expect(result).toEqual({ error: 'Email already in use' });
  });
});

describe('signIn', () => {
  it('returns no error on success', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null });
    const result = await signIn('a@b.com', 'password123');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on invalid credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } });
    const result = await signIn('a@b.com', 'wrong');
    expect(result).toEqual({ error: 'Invalid login credentials' });
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('getCurrentUserProfile', () => {
  it('returns null when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const profile = await getCurrentUserProfile();
    expect(profile).toBeNull();
  });

  it('returns the profile row for the current session user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null },
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const profile = await getCurrentUserProfile();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(profile).toEqual({
      id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null,
    });
  });
});

describe('redeemInviteCode', () => {
  it('returns no error on success', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
    const result = await redeemInviteCode('ABC123');
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite_code', { p_code: 'ABC123' });
    expect(result).toEqual({ error: null });
  });

  it('returns the error message when the code is invalid', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: { message: 'Invalid invite code' } });
    const result = await redeemInviteCode('BADCODE');
    expect(result).toEqual({ error: 'Invalid invite code' });
  });
});
