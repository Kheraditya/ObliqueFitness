import { supabase } from '../../lib/supabase';

export interface PeriodSummary {
  workouts: number;
  durationSeconds: number;
  volume: number;
  sets: number;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  workouts: number;
  durationSeconds: number;
  volume: number;
}

interface PeriodSessionRow {
  ended_at: string | null;
  duration_seconds: number | null;
  workout_sets: { weight: number | null; reps: number | null }[];
}

interface MuscleSetRow {
  workout_sets: { exercises: { primary_muscles: string[] } | null }[];
}

interface MonthlySessionRow {
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  workout_sets: { weight: number | null; reps: number | null }[];
}

export async function getPeriodSummary(startISO: string, endISO: string): Promise<PeriodSummary> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('ended_at, duration_seconds, workout_sets(weight, reps)')
    .gte('started_at', startISO)
    .lt('started_at', endISO);

  const rows = (data ?? []) as unknown as PeriodSessionRow[];
  const finished = rows.filter((r) => r.ended_at != null);

  let volume = 0;
  let sets = 0;
  for (const row of finished) {
    for (const set of row.workout_sets) {
      volume += (set.weight ?? 0) * (set.reps ?? 0);
      sets += 1;
    }
  }

  return {
    workouts: finished.length,
    durationSeconds: finished.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0),
    volume,
    sets,
  };
}

export async function getSetsCountByMuscle(startISO: string, endISO: string): Promise<{ muscle: string; sets: number }[]> {
  const { data } = await supabase
    .from('workout_sessions')
    .select('ended_at, workout_sets(exercises(primary_muscles))')
    .gte('started_at', startISO)
    .lt('started_at', endISO)
    .not('ended_at', 'is', null);

  const rows = (data ?? []) as unknown as MuscleSetRow[];
  const totals = new Map<string, number>();

  for (const row of rows) {
    for (const set of row.workout_sets) {
      for (const muscle of set.exercises?.primary_muscles ?? []) {
        totals.set(muscle, (totals.get(muscle) ?? 0) + 1);
      }
    }
  }

  return Array.from(totals.entries()).map(([muscle, sets]) => ({ muscle, sets }));
}

export async function getMonthlyTotals(monthsBack: number): Promise<MonthlyTotal[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const { data } = await supabase
    .from('workout_sessions')
    .select('started_at, ended_at, duration_seconds, workout_sets(weight, reps)')
    .gte('started_at', start.toISOString())
    .not('ended_at', 'is', null);

  const rows = (data ?? []) as unknown as MonthlySessionRow[];

  const buckets = new Map<string, MonthlyTotal>();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { month: key, workouts: 0, durationSeconds: 0, volume: 0 });
  }

  for (const row of rows) {
    const d = new Date(row.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.workouts += 1;
    bucket.durationSeconds += row.duration_seconds ?? 0;
    for (const set of row.workout_sets) {
      bucket.volume += (set.weight ?? 0) * (set.reps ?? 0);
    }
  }

  return Array.from(buckets.values());
}
