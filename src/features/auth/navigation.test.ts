import { getInitialRoute } from './navigation';
import type { Profile } from './types';

const session = { user: { id: 'user-1' } } as any;
const memberProfile: Profile = {
  id: 'user-1',
  email: 'a@b.com',
  role: 'member',
  gym_id: 'gym-1',
  name: null,
  avatar_url: null,
  bio: null,
  link: null,
  sex: null,
  birthday: null,
};
const adminProfile: Profile = { ...memberProfile, role: 'admin' };
const noGymProfile: Profile = { ...memberProfile, gym_id: null };
const pausedProfile: Profile = { ...memberProfile, app_access_enabled: false };

describe('getInitialRoute', () => {
  it('routes to login when there is no session', () => {
    expect(getInitialRoute(null, null)).toBe('/(auth)/login');
  });

  it('routes to join-gym when the profile has no gym_id', () => {
    expect(getInitialRoute(session, noGymProfile)).toBe('/(auth)/join-gym');
  });

  it('routes members to the member home', () => {
    expect(getInitialRoute(session, memberProfile)).toBe('/(member)/home');
  });

  it('routes admins to the admin dashboard', () => {
    expect(getInitialRoute(session, adminProfile)).toBe('/(admin)/dashboard');
  });

  it('routes a disabled user to the access-paused screen', () => {
    expect(getInitialRoute(session, pausedProfile)).toBe('/(auth)/access-paused');
  });
});
