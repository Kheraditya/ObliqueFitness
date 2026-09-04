import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from './api';
import type { Profile } from './types';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, profile: null });

  useEffect(() => {
    let isMounted = true;

    async function loadForSession(session: Session | null) {
      if (!session) {
        if (isMounted) setState({ loading: false, session: null, profile: null });
        return;
      }
      const profile = await getCurrentUserProfile();
      if (isMounted) setState({ loading: false, session, profile });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadForSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }));
      loadForSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
