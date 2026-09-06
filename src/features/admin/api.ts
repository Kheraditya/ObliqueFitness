import { supabase } from '../../lib/supabase';
import type {
  AdminMember,
  AdminMembership,
  MemberProgress,
  MembershipInput,
  MembershipStatus,
} from './types';

interface MembershipRow {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string | null;
  status: MembershipStatus;
  created_at?: string;
}

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  app_access_enabled: boolean;
  memberships: MembershipRow[];
}

function mapMembership(row: MembershipRow | undefined): AdminMembership | null {
  if (!row) return null;
  return {
    id: row.id,
    planName: row.plan_name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  };
}

function mapMember(row: MemberRow): AdminMember {
  const latestMembership = row.memberships
    ?.slice()
    .sort((a, b) => (b.created_at ?? b.start_date).localeCompare(a.created_at ?? a.start_date))[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    accessEnabled: row.app_access_enabled !== false,
    membership: mapMembership(latestMembership),
  };
}

const memberSelection =
  'id, email, name, avatar_url, app_access_enabled, memberships(id, plan_name, start_date, end_date, status, created_at)';

export async function getGymWelcomeCode(): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_current_gym_welcome_code');
  return { code: error ? null : (data as string), error: error ? error.message : null };
}

export async function rotateGymWelcomeCode(): Promise<{ code: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('rotate_gym_welcome_code');
  return { code: error ? null : (data as string), error: error ? error.message : null };
}

export async function setMemberAppAccess(memberId: string, enabled: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_member_app_access', { p_member_id: memberId, p_enabled: enabled });
  return { error: error ? error.message : null };
}

export async function listGymMembers(): Promise<AdminMember[]> {
  const { data, error } = await supabase
    .from('users')
    .select(memberSelection)
    .eq('role', 'member')
    .order('name', { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return (data as unknown as MemberRow[]).map(mapMember);
}

export async function getAdminMember(memberId: string): Promise<AdminMember | null> {
  const { data, error } = await supabase
    .from('users')
    .select(memberSelection)
    .eq('id', memberId)
    .eq('role', 'member')
    .maybeSingle();

  if (error || !data) return null;
  return mapMember(data as unknown as MemberRow);
}

interface ProgressSessionRow {
  started_at: string;
  duration_seconds: number | null;
  workout_sets: { weight: number | null; reps: number | null }[];
}

export async function getMemberProgress(memberId: string): Promise<MemberProgress> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at, duration_seconds, workout_sets(weight, reps)')
    .eq('user_id', memberId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  const sessions = (data ?? []) as unknown as ProgressSessionRow[];
  const { data: weightData } = await supabase
    .from('body_measurements')
    .select('value, unit, logged_at')
    .eq('user_id', memberId)
    .eq('type', 'weight')
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const weight = weightData as { value: number; unit: string; logged_at: string } | null;
  return {
    workoutCount: sessions.length,
    totalVolume: sessions.reduce(
      (total, session) =>
        total + session.workout_sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0),
      0
    ),
    totalDurationSeconds: sessions.reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0),
    lastWorkoutAt: sessions[0]?.started_at ?? null,
    latestWeight: weight
      ? { value: weight.value, unit: weight.unit, loggedAt: weight.logged_at }
      : null,
  };
}

export async function saveMemberMembership(
  memberId: string,
  input: MembershipInput,
  membershipId?: string
): Promise<{ error: string | null; id: string | null }> {
  const values = {
    user_id: memberId,
    plan_name: input.planName,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
  };

  if (membershipId) {
    const { error } = await supabase.from('memberships').update(values).eq('id', membershipId);
    return { error: error ? error.message : null, id: error ? null : membershipId };
  }

  const { data, error } = await supabase.from('memberships').insert(values).select('id').single();
  return {
    error: error ? error.message : null,
    id: data ? (data as { id: string }).id : null,
  };
}

export async function listMemberRoutines(
  memberId: string
): Promise<{ id: string; name: string; exerciseCount: number }[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, routine_exercises(id)')
    .eq('owner_id', memberId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as unknown as { id: string; name: string; routine_exercises: { id: string }[] }[]).map(
    (routine) => ({ id: routine.id, name: routine.name, exerciseCount: routine.routine_exercises.length })
  );
}

export async function getMyProgress(): Promise<MemberProgress> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      workoutCount: 0,
      totalVolume: 0,
      totalDurationSeconds: 0,
      lastWorkoutAt: null,
      latestWeight: null,
    };
  }
  return getMemberProgress(session.user.id);
}

export async function listMyRoutines(): Promise<{ id: string; name: string; exerciseCount: number }[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  return listMemberRoutines(session.user.id);
}

export async function createAssignedRoutine(
  memberId: string,
  name: string,
  exerciseIds: string[]
): Promise<{ error: string | null; id: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated', id: null };

  const { data, error } = await supabase
    .from('routines')
    .insert({ owner_id: memberId, assigned_by_admin_id: session.user.id, name: name.trim() })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create routine', id: null };
  const routineId = (data as { id: string }).id;

  if (exerciseIds.length > 0) {
    const { error: exerciseError } = await supabase.from('routine_exercises').insert(
      exerciseIds.map((exerciseId, index) => ({
        routine_id: routineId,
        exercise_id: exerciseId,
        order: index,
        target_sets: 3,
        rest_seconds: 90,
        notes: null,
        superset_group: null,
      }))
    );
    if (exerciseError) return { error: exerciseError.message, id: routineId };
  }

  return { error: null, id: routineId };
}
