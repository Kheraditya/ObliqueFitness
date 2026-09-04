import { supabase } from '../../lib/supabase';
import type { Routine, RoutineExercise, RoutineExerciseDraft, VolumeHistoryPoint } from './types';

interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  rest_seconds: number;
  superset_group: number | null;
  exercises: { name: string } | null;
}

export async function listRoutines(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('routines').select('id, name').order('name', { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const { data: routineRow } = await supabase.from('routines').select('id, name').eq('id', id).maybeSingle();
  if (!routineRow) return null;

  const { data } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, order, target_sets, rest_seconds, superset_group, exercises(name)')
    .eq('routine_id', id)
    .order('order', { ascending: true });

  const rows = (data ?? []) as unknown as RoutineExerciseRow[];

  const exercises: RoutineExercise[] = rows.map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercises?.name ?? '',
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
      superset_group: ex.supersetGroup,
    }));
    const { error: insertError } = await supabase.from('routine_exercises').insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return { error: null };
}

interface VolumeHistoryRow {
  started_at: string;
  workout_sets: { weight: number | null; reps: number | null }[];
}

export async function getRoutineVolumeHistory(routineId: string): Promise<VolumeHistoryPoint[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, workout_sets(weight, reps)')
    .eq('routine_id', routineId)
    .order('started_at', { ascending: true });

  if (error || !data) return [];

  const rows = data as unknown as VolumeHistoryRow[];

  return rows.map((row) => ({
    date: row.started_at,
    volume: row.workout_sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0),
  }));
}
