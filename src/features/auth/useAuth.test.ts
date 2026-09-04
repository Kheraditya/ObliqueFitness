import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

jest.mock('./api', () => ({
  getCurrentUserProfile: jest.fn(),
}));

import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from './api';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('starts in a loading state with no session or profile', async () => {
    // Use a never-resolving promise so the initial state is observable before
    // getSession() settles (RNTL's renderHook fully flushes the microtask
    // queue while awaiting the initial render).
    (supabase.auth.getSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = await renderHook(() => useAuth());
    expect(result.current).toEqual({ loading: true, session: null, profile: null });
  });

  it('resolves to no session and no profile when logged out', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { result } = await renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('loads the profile when a session exists', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    const fakeProfile = { id: 'user-1', email: 'a@b.com', role: 'member', gym_id: null, name: null, avatar_url: null };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: fakeSession } });
    (getCurrentUserProfile as jest.Mock).mockResolvedValue(fakeProfile);

    const { result } = await renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.profile).toEqual(fakeProfile);
  });
});
