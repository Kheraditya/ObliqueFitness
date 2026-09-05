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

export interface CreateExerciseInput {
  name: string;
  equipment: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  exerciseType: string | null;
}

export async function createExercise(input: CreateExerciseInput): Promise<{ id: string | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { id: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name,
      equipment: input.equipment,
      primary_muscles: input.primaryMuscle ? [input.primaryMuscle] : [],
      secondary_muscles: input.secondaryMuscles,
      exercise_type: input.exerciseType,
      is_custom: true,
      created_by: session.user.id,
    })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error ? error.message : 'Failed to create exercise' };
  return { id: (data as { id: string }).id, error: null };
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

export async function getStrengthTrend(exerciseId: string): Promise<{ date: string; maxWeight: number; best1RM: number }[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, session_id, workout_sessions(started_at)')
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as HistoryRow[];
  const bySession = new Map<string, { date: string; maxWeight: number; best1RM: number }>();

  for (const row of rows) {
    const date = row.workout_sessions?.started_at ?? '';
    const weight = row.weight ?? 0;
    const reps = row.reps ?? 0;
    const oneRM = weight * (1 + reps / 30);

    const existing = bySession.get(row.session_id);
    if (!existing) {
      bySession.set(row.session_id, { date, maxWeight: weight, best1RM: oneRM });
    } else {
      existing.maxWeight = Math.max(existing.maxWeight, weight);
      existing.best1RM = Math.max(existing.best1RM, oneRM);
    }
  }

  return Array.from(bySession.values()).sort((a, b) => a.date.localeCompare(b.date));
}

interface LoggedExerciseRow {
  exercise_id: string;
  exercises: { name: string } | null;
}

export async function getLoggedExercises(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from('workout_sets').select('exercise_id, exercises(name)');
  if (error || !data) return [];

  const rows = data as unknown as LoggedExerciseRow[];
  const seen = new Map<string, string>();

  for (const row of rows) {
    if (!seen.has(row.exercise_id)) seen.set(row.exercise_id, row.exercises?.name ?? '');
  }

  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

export async function getLeaderboardOptIn(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  const { data } = await supabase.from('users').select('leaderboard_opt_in').eq('id', session.user.id).maybeSingle();
  return (data as { leaderboard_opt_in: boolean } | null)?.leaderboard_opt_in ?? false;
}
