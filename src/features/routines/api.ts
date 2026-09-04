import { supabase } from '../../lib/supabase';
import type { Routine, RoutineExercise } from './types';

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
