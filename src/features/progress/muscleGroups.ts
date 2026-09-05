export type MuscleGroup = 'Back' | 'Chest' | 'Legs' | 'Core' | 'Shoulders' | 'Arms';

export const MUSCLE_GROUPS: MuscleGroup[] = ['Back', 'Chest', 'Legs', 'Core', 'Shoulders', 'Arms'];

export const MUSCLE_TO_GROUP: Record<string, MuscleGroup> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  neck: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  abdominals: 'Core',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  adductors: 'Legs',
  abductors: 'Legs',
  lats: 'Back',
  'middle back': 'Back',
  'lower back': 'Back',
  traps: 'Back',
};

export function groupCounts(bySpecificMuscle: { muscle: string; sets: number }[]): Record<MuscleGroup, number> {
  const result: Record<MuscleGroup, number> = { Back: 0, Chest: 0, Legs: 0, Core: 0, Shoulders: 0, Arms: 0 };

  for (const { muscle, sets } of bySpecificMuscle) {
    const group = MUSCLE_TO_GROUP[muscle];
    if (group) result[group] += sets;
  }

  return result;
}
