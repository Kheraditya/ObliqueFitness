import type { Session } from '@supabase/supabase-js';
import type { Profile } from './types';

export type InitialRoute = '/(auth)/login' | '/(auth)/join-gym' | '/(auth)/access-paused' | '/(member)/home' | '/(admin)/dashboard';

export function getInitialRoute(session: Session | null, profile: Profile | null): InitialRoute {
  if (!session) return '/(auth)/login';
  if (profile && profile.app_access_enabled === false) return '/(auth)/access-paused';
  if (!profile || !profile.gym_id) return '/(auth)/join-gym';
  return profile.role === 'admin' ? '/(admin)/dashboard' : '/(member)/home';
}
