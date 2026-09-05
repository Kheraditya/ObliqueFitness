import { supabase } from '../../lib/supabase';
import type { Profile } from './types';

export async function signUp(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? error.message : null };
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return data as Profile | null;
}

export interface ProfileEdits {
  name: string | null;
  bio: string | null;
  link: string | null;
  sex: string | null;
  birthday: string | null;
}

export async function updateProfile(edits: ProfileEdits): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const { error } = await supabase.from('users').update(edits).eq('id', session.user.id);
  return { error: error ? error.message : null };
}

export async function redeemInviteCode(code: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('redeem_invite_code', { p_code: code });
  return { error: error ? error.message : null };
}
