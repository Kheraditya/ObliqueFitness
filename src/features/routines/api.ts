import { supabase } from '../../lib/supabase';
import type {
  Routine,
  RoutineExercise,
  RoutineExerciseDraft,
  RoutinePerformance,
  VolumeHistoryPoint,
} from './types';

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  rest_seconds: number;
  notes: string | null;
  superset_group: number | null;
  exercises: { name: string; images: string[] } | null;
}

interface RoutineListRow {
  id: string;
  name: string;
  routine_exercises: { order: number; exercises: { name: string } | null }[];
}

export async function listRoutines(): Promise<{ id: string; name: string; exercisePreview: string }[]> {
  const { data } = await supabase
    .from('routines')
    .select('id, name, routine_exercises(order, exercises(name))')
    .order('name', { ascending: true });

  const rows = (data ?? []) as unknown as RoutineListRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    exercisePreview: row.routine_exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((re) => re.exercises?.name)
      .filter((exerciseName): exerciseName is string => Boolean(exerciseName))
      .join(', '),
  }));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data: routineRow } = await supabase.from('routines').select('id, name').eq('id', id).maybeSingle();
  if (!routineRow) return null;

  const { data } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, order, target_sets, rest_seconds, notes, superset_group, exercises(name, images)')
    .eq('routine_id', id)
    .order('order', { ascending: true });

  const rows = (data ?? []) as unknown as RoutineExerciseRow[];

  const exercises: RoutineExercise[] = rows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercises?.name ?? '',
    imageUri: row.exercises?.images?.[0],
    notes: row.notes ?? '',
    order: row.order,
    targetSets: row.target_sets,
    restSeconds: row.rest_seconds,
    supersetGroup: row.superset_group,
  }));

  return { id: (routineRow as { id: string; name: string }).id, name: (routineRow as { id: string; name: string }).name, exercises };
}

export async function deleteRoutine(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  return { error: error ? error.message : null };
}

export async function createRoutine(
  name: string,
  exercises: RoutineExerciseDraft[]
): Promise<{ id: string | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { id: null, error: 'Not authenticated' };

  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ owner_id: session.user.id, name })
    .select('id')
    .single();

  if (routineError || !routine) {
    return { id: null, error: routineError ? routineError.message : 'Failed to create routine' };
  }

  const routineId = (routine as { id: string }).id;

  if (exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      routine_id: routineId,
      exercise_id: ex.exerciseId,
      order: index,
      target_sets: ex.targetSets,
      rest_seconds: ex.restSeconds,
      notes: ex.notes ?? null,
      superset_group: ex.supersetGroup,
    }));
    const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows);
    if (exercisesError) return { id: routineId, error: exercisesError.message };
  }

  return { id: routineId, error: null };
}

export async function updateRoutine(
  id: string,
  name: string,
  exercises: RoutineExerciseDraft[]
): Promise<{ error: string | null }> {
  const { error: nameError } = await supabase.from('routines').update({ name }).eq('id', id);
  if (nameError) return { error: nameError.message };

  const { error: deleteError } = await supabase.from('routine_exercises').delete().eq('routine_id', id);
  if (deleteError) return { error: deleteError.message };

  if (exercises.length > 0) {
    const rows = exercises.map((ex, index) => ({
      routine_id: id,
      exercise_id: ex.exerciseId,
      order: index,
      target_sets: ex.targetSets,
      rest_seconds: ex.restSeconds,
      notes: ex.notes ?? null,
      superset_group: ex.supersetGroup,
    }));
    const { error: insertError } = await supabase.from('routine_exercises').insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return { error: null };
}

interface VolumeHistoryRow {
  started_at: string;
  duration_seconds: number | null;
  workout_sets: { weight: number | null; reps: number | null }[];
}

export async function getRoutineVolumeHistory(routineId: string): Promise<VolumeHistoryPoint[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, duration_seconds, workout_sets(weight, reps)')
    .eq('routine_id', routineId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as VolumeHistoryRow[];

  return rows.map((row) => ({
    date: row.started_at,
    volume: row.workout_sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0),
    reps: row.workout_sets.reduce((sum, s) => sum + (s.reps ?? 0), 0),
    durationSeconds: row.duration_seconds ?? 0,
  }));
}

interface LatestPerformanceRow {
  started_at: string;
  duration_seconds: number | null;
  workout_sets: {
    exercise_id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
  }[];
}

export async function getLatestRoutinePerformance(routineId: string): Promise<RoutinePerformance | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, duration_seconds, workout_sets(exercise_id, set_number, weight, reps)')
    .eq('routine_id', routineId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as LatestPerformanceRow;
  return {
    date: row.started_at,
    durationSeconds: row.duration_seconds ?? 0,
    sets: row.workout_sets
      .slice()
      .sort((a, b) => a.exercise_id.localeCompare(b.exercise_id) || a.set_number - b.set_number)
      .map((set) => ({
        exerciseId: set.exercise_id,
        setNumber: set.set_number,
        weight: set.weight,
        reps: set.reps,
      })),
  };
}
