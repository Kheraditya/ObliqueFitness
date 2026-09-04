import { supabase } from '../../lib/supabase';
import type { Exercise, PersonalRecords, HistoryEntry, LeaderboardEntry } from './types';

interface WorkoutSetRow {
  weight: number | null;
  reps: number | null;
  session_id: string;
}

interface HistoryRow extends WorkoutSetRow {
  workout_sessions: { started_at: string } | null;
}

interface LeaderboardRow {
  user_id: string;
  name: string | null;
  heaviest_weight: number;
}

export async function listExercises(): Promise<Exercise[]> {
  const { data } = await supabase.from('exercises').select('*').order('name', { ascending: true });
  return (data ?? []) as Exercise[];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data } = await supabase.from('exercises').select('*').eq('id', id).maybeSingle();
  return data as Exercise | null;
}

const emptyRecords: PersonalRecords = {
  heaviestWeight: null,
  best1RM: null,
  bestSetVolume: null,
  bestSessionVolume: null,
};

export async function getPersonalRecords(exerciseId: string): Promise<PersonalRecords> {
  const { data, error } = await supabase.from('workout_sets').select('weight, reps, session_id').eq('exercise_id', exerciseId);

  if (error || !data || data.length === 0) return emptyRecords;

  const sets = data as unknown as WorkoutSetRow[];

  const heaviestWeight = Math.max(...sets.map((s) => s.weight ?? 0));
  const best1RM = Math.max(...sets.map((s) => (s.weight ?? 0) * (1 + (s.reps ?? 0) / 30)));
  const bestSetVolume = Math.max(...sets.map((s) => (s.weight ?? 0) * (s.reps ?? 0)));

  const volumeBySession = new Map<string, number>();
  for (const s of sets) {
    const volume = (s.weight ?? 0) * (s.reps ?? 0);
    volumeBySession.set(s.session_id, (volumeBySession.get(s.session_id) ?? 0) + volume);
  }
  const bestSessionVolume = Math.max(...Array.from(volumeBySession.values()));

  return { heaviestWeight, best1RM, bestSetVolume, bestSessionVolume };
}

export async function getExerciseHistory(exerciseId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, session_id, workout_sessions(started_at)')
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as HistoryRow[];
  const bySession = new Map<string, HistoryEntry>();

  for (const row of rows) {
    if (!bySession.has(row.session_id)) {
      bySession.set(row.session_id, {
        sessionId: row.session_id,
        date: row.workout_sessions?.started_at ?? '',
        sets: [],
      });
    }
    bySession.get(row.session_id)!.sets.push({ weight: row.weight, reps: row.reps });
  }

  return Array.from(bySession.values());
}

export async function getLeaderboard(exerciseId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_exercise_leaderboard', { p_exercise_id: exerciseId });
  if (error || !data) return [];

  return (data as LeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    name: row.name,
    heaviestWeight: row.heaviest_weight,
  }));
}

export async function setLeaderboardOptIn(optIn: boolean): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: 'Not authenticated' };

  const { error } = await supabase.from('users').update({ leaderboard_opt_in: optIn }).eq('id', session.user.id);
  return { error: error ? error.message : null };
}
