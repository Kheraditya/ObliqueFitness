import { supabase } from '../../lib/supabase';
import { computeStreak } from './streak';
import { computeVolumeChangePct } from './volume';

export interface HomeSummary {
  workoutCountThisWeek: number;
  volumeChangePct: number | null;
  streakDays: number;
  muscleVolumes: { muscle: string; volume: number }[];
}

interface SessionWithSetsRow {
  started_at: string;
  ended_at: string | null;
  workout_sets: {
    weight: number | null;
    reps: number | null;
    exercises: { primary_muscles: string[]; secondary_muscles?: string[] } | null;
  }[];
}

interface StreakSessionRow {
  started_at: string;
  ended_at: string | null;
}

function daysAgoISOString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function toDateString(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sessionVolume(row: SessionWithSetsRow): number {
  return row.workout_sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
}

function sumMuscleVolumes(rows: SessionWithSetsRow[]): { muscle: string; volume: number }[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    for (const set of row.workout_sets) {
      const weightedVolume = (set.weight ?? 0) * (set.reps ?? 0);
      // Bodyweight and duration-style entries often have no kg value. A completed set still
      // needs a non-zero score or its muscle receives the same fill as an untrained muscle.
      const effort = weightedVolume > 0 ? weightedVolume : Math.max(set.reps ?? 0, 1);
      const primary = set.exercises?.primary_muscles ?? [];
      const secondary = set.exercises?.secondary_muscles ?? [];
      for (const rawMuscle of primary) {
        const muscle = rawMuscle.trim().toLowerCase();
        totals.set(muscle, (totals.get(muscle) ?? 0) + effort);
      }
      for (const rawMuscle of secondary) {
        const muscle = rawMuscle.trim().toLowerCase();
        if (primary.some((value) => value.trim().toLowerCase() === muscle)) continue;
        totals.set(muscle, (totals.get(muscle) ?? 0) + effort * 0.5);
      }
    }
  }

  return Array.from(totals.entries()).map(([muscle, volume]) => ({ muscle, volume }));
}

export async function getMuscleVolumes(): Promise<{ muscle: string; volume: number }[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, ended_at, workout_sets(weight, reps, exercises(primary_muscles, secondary_muscles))')
    .gte('started_at', daysAgoISOString(7))
    .not('ended_at', 'is', null);

  if (error || !data) return [];

  return sumMuscleVolumes(data as unknown as SessionWithSetsRow[]);
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, ended_at, workout_sets(weight, reps, exercises(primary_muscles))')
    .gte('started_at', daysAgoISOString(14));

  const rows = error || !data ? [] : (data as unknown as SessionWithSetsRow[]);

  const sevenDaysAgo = daysAgoISOString(7);
  const thisWeekRows = rows.filter((r) => r.started_at >= sevenDaysAgo);
  const lastWeekRows = rows.filter((r) => r.started_at < sevenDaysAgo);
  const finishedThisWeekRows = thisWeekRows.filter((r) => r.ended_at != null);

  const thisWeekVolume = thisWeekRows.reduce((sum, r) => sum + sessionVolume(r), 0);
  const lastWeekVolume = lastWeekRows.reduce((sum, r) => sum + sessionVolume(r), 0);

  const { data: streakData } = await supabase
    .from('workout_sessions')
    .select('started_at, ended_at')
    .gte('started_at', daysAgoISOString(90))
    .order('started_at', { ascending: false });

  const streakRows = (streakData ?? []) as unknown as StreakSessionRow[];
  const completedDates = streakRows.filter((r) => r.ended_at != null).map((r) => toDateString(r.started_at));

  return {
    workoutCountThisWeek: finishedThisWeekRows.length,
    volumeChangePct: computeVolumeChangePct(thisWeekVolume, lastWeekVolume),
    streakDays: computeStreak(completedDates),
    muscleVolumes: sumMuscleVolumes(thisWeekRows),
  };
}
