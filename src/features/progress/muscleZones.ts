export type Zone =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'adductors'
  | 'traps'
  | 'upperBack'
  | 'lowerBack'
  | 'triceps'
  | 'glutes'
  | 'hamstrings'
  | 'abductors'
  | 'calves';

export const FRONT_ZONES: Zone[] = ['neck', 'shoulders', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors'];
export const BACK_ZONES: Zone[] = ['traps', 'upperBack', 'lowerBack', 'triceps', 'glutes', 'hamstrings', 'abductors', 'calves'];

export const MUSCLE_TO_ZONE: Record<string, Zone> = {
  neck: 'neck',
  shoulders: 'shoulders',
  chest: 'chest',
  biceps: 'biceps',
  forearms: 'forearms',
  abdominals: 'abs',
  quadriceps: 'quads',
  adductors: 'adductors',
  traps: 'traps',
  lats: 'upperBack',
  'middle back': 'upperBack',
  'lower back': 'lowerBack',
  triceps: 'triceps',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  abductors: 'abductors',
  calves: 'calves',
};

export function zoneVolumes(muscleVolumes: { muscle: string; volume: number }[]): Record<Zone, number> {
  const result: Record<Zone, number> = {
    neck: 0,
    shoulders: 0,
    chest: 0,
    biceps: 0,
    forearms: 0,
    abs: 0,
    quads: 0,
    adductors: 0,
    traps: 0,
    upperBack: 0,
    lowerBack: 0,
    triceps: 0,
    glutes: 0,
    hamstrings: 0,
    abductors: 0,
    calves: 0,
  };

  for (const { muscle, volume } of muscleVolumes) {
    const zone = MUSCLE_TO_ZONE[muscle];
    if (zone) result[zone] += volume;
  }

  return result;
}
