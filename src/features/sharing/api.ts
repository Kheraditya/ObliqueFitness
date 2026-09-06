import { supabase } from '../../lib/supabase';

export interface ShareRecipient {
  id: string;
  name: string | null;
  email: string;
}

export async function listShareRecipients(): Promise<ShareRecipient[]> {
  const { data, error } = await supabase.rpc('list_gym_share_recipients');
  if (!error && data) return data as ShareRecipient[];

  // Admins can still populate the picker through their existing same-gym users policy if the
  // RPC has not reached the device's PostgREST schema cache yet. Members deliberately rely on
  // the guarded RPC because their ordinary users policy only exposes their own profile.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('gym_id, role')
    .eq('id', session.user.id)
    .maybeSingle();
  const currentUser = profile as { gym_id: string | null; role: string } | null;
  if (!currentUser?.gym_id || currentUser.role !== 'admin') {
    throw new Error(error?.message ?? 'Could not load gym members');
  }

  const { data: recipients, error: fallbackError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('gym_id', currentUser.gym_id)
    .neq('id', session.user.id)
    .order('name', { ascending: true, nullsFirst: false });
  if (fallbackError) throw new Error(fallbackError.message);
  return (recipients ?? []) as ShareRecipient[];
}

export async function shareRoutine(
  routineId: string,
  recipientId: string
): Promise<{ error: string | null; routineId: string | null }> {
  const { data, error } = await supabase.rpc('share_routine_with_gym_member', {
    p_routine_id: routineId,
    p_recipient_id: recipientId,
  });
  if (!error && data) return { error: null, routineId: String(data) };

  // Equivalent admin-only fallback for deployments where PostgREST has not discovered the new
  // function yet. Every read and insert remains protected by the existing same-gym admin RLS.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated', routineId: null };

  const { data: sender } = await supabase
    .from('users')
    .select('gym_id, role')
    .eq('id', session.user.id)
    .maybeSingle();
  const admin = sender as { gym_id: string | null; role: string } | null;
  if (!admin?.gym_id || admin.role !== 'admin') {
    return { error: error?.message ?? 'Could not share routine', routineId: null };
  }

  const { data: recipient } = await supabase
    .from('users')
    .select('id')
    .eq('id', recipientId)
    .eq('gym_id', admin.gym_id)
    .maybeSingle();
  if (!recipient || recipientId === session.user.id) {
    return { error: 'Recipient must be another user in your gym', routineId: null };
  }

  const { data: source } = await supabase
    .from('routines')
    .select('name, notes')
    .eq('id', routineId)
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (!source) return { error: 'Routine not found or not owned by you', routineId: null };

  const sourceRoutine = source as { name: string; notes: string | null };
  const { data: copy, error: copyError } = await supabase
    .from('routines')
    .insert({
      owner_id: recipientId,
      assigned_by_admin_id: session.user.id,
      name: sourceRoutine.name,
      notes: sourceRoutine.notes,
    })
    .select('id')
    .single();
  if (copyError || !copy) return { error: copyError?.message ?? 'Could not share routine', routineId: null };

  const copiedRoutineId = (copy as { id: string }).id;
  const { data: sourceExercises, error: sourceExercisesError } = await supabase
    .from('routine_exercises')
    .select('exercise_id, order, target_sets, rest_seconds, notes, superset_group')
    .eq('routine_id', routineId);
  if (sourceExercisesError) return { error: sourceExercisesError.message, routineId: copiedRoutineId };

  const exerciseRows = (sourceExercises ?? []) as {
    exercise_id: string;
    order: number;
    target_sets: number;
    rest_seconds: number;
    notes: string | null;
    superset_group: number | null;
  }[];
  if (exerciseRows.length) {
    const { error: insertError } = await supabase.from('routine_exercises').insert(
      exerciseRows.map((exercise) => ({ ...exercise, routine_id: copiedRoutineId }))
    );
    if (insertError) return { error: insertError.message, routineId: copiedRoutineId };
  }

  return { error: null, routineId: copiedRoutineId };
}
