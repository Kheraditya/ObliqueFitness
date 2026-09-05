import { supabase } from '../../lib/supabase';
import type { SessionExercise, LoggedSet } from './types';

interface SessionRow {
  routine_id: string | null;
  started_at: string;
}

interface RoutineExerciseRow {
  exercise_id: string;
  order: number;
  rest_seconds: number;
  superset_group: number | null;
  exercises: { name: string } | null;
}

interface LoggedExerciseRow {
  exercise_id: string;
  exercises: { name: string } | null;
}

interface LoggedSetRow {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

export async function startSession(routineId: string | null): Promise<{ id: string | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { id: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: session.user.id, routine_id: routineId })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error ? error.message : 'Failed to start session' };
  return { id: (data as { id: string }).id, error: null };
}

export async function getSessionExercises(
  sessionId: string
): Promise<{ exercises: SessionExercise[]; startedAt: string }> {
  const { data: sessionRow } = await supabase
    .from('workout_sessions')
    .select('routine_id, started_at')
    .eq('id', sessionId)
    .maybeSingle();

  const row = sessionRow as SessionRow | null;
  const routineId = row?.routine_id ?? null;
  const startedAt = row?.started_at ?? new Date().toISOString();

  const exercises: SessionExercise[] = [];

  if (routineId) {
    const { data } = await supabase
      .from('routine_exercises')
      .select('exercise_id, order, rest_seconds, superset_group, exercises(name)')
      .eq('routine_id', routineId)
      .order('order', { ascending: true });

    const rows = (data ?? []) as unknown as RoutineExerciseRow[];
    for (const r of rows) {
      exercises.push({
        exerciseId: r.exercise_id,
        exerciseName: r.exercises?.name ?? '',
        order: r.order,
        restSeconds: r.rest_seconds,
        supersetGroup: r.superset_group,
      });
    }
  }

  const { data: loggedData } = await supabase.from('workout_sets').select('exercise_id, exercises(name)').eq('session_id', sessionId);

  const loggedRows = (loggedData ?? []) as unknown as LoggedExerciseRow[];
  const knownIds = new Set(exercises.map((e) => e.exerciseId));

  for (const r of loggedRows) {
    if (knownIds.has(r.exercise_id)) continue;
    knownIds.add(r.exercise_id);
    exercises.push({
      exerciseId: r.exercise_id,
      exerciseName: r.exercises?.name ?? '',
      order: exercises.length,
      restSeconds: 90,
      supersetGroup: null,
    });
  }

  return { exercises, startedAt };
}

export async function getLoggedSets(sessionId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('id, exercise_id, set_number, weight, reps, rpe')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as LoggedSetRow[]).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
    rpe: row.rpe,
  }));
}

export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weight: number | null,
  reps: number | null,
  rpe: number | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('workout_sets').insert({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    weight,
    reps,
    rpe,
  });
  return { error: error ? error.message : null };
}

export async function updateWorkoutSet(
  setId: string,
  weight: number | null,
  reps: number | null,
  rpe: number | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('workout_sets').update({ weight, reps, rpe }).eq('id', setId);
  return { error: error ? error.message : null };
}

export interface RecentSession {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
}

export interface WorkoutSummary {
  count: number;
  recent: RecentSession[];
}

interface RecentSessionRow {
  id: string;
  started_at: string;
  duration_seconds: number | null;
}

export async function getWorkoutSummary(): Promise<WorkoutSummary> {
  const { count } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .not('ended_at', 'is', null);

  const { data } = await supabase
    .from('workout_sessions')
    .select('id, started_at, duration_seconds')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(5);

  const rows = (data ?? []) as unknown as RecentSessionRow[];

  return {
    count: count ?? 0,
    recent: rows.map((row) => ({ id: row.id, startedAt: row.started_at, durationSeconds: row.duration_seconds })),
  };
}

export async function finishSession(sessionId: string, startedAt: string): Promise<{ error: string | null }> {
  // Use Date.now() explicitly (rather than `new Date()`) so this respects a mocked clock in
  // tests -- `new Date()` reads the system clock independently of `Date.now()` and does not
  // honor a `jest.spyOn(Date, 'now')` mock.
  const endedAt = new Date(Date.now());
  const durationSeconds = Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000);

  const { error } = await supabase
    .from('workout_sessions')
    .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds })
    .eq('id', sessionId);

  return { error: error ? error.message : null };
}
