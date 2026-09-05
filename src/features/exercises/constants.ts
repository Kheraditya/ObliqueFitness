import type { Ionicons } from '@expo/vector-icons';

export interface EquipmentOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Ionicons has no dedicated gym-equipment glyphs, so these are the closest reasonable
// approximations (e.g. "fitness-outline" happens to render as a dumbbell) rather than the
// custom illustrations a real icon set would use.
export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { key: 'None', label: 'None', icon: 'body-outline' },
  { key: 'Barbell', label: 'Barbell', icon: 'barbell-outline' },
  { key: 'Dumbbell', label: 'Dumbbell', icon: 'fitness-outline' },
  { key: 'Kettlebell', label: 'Kettlebell', icon: 'ellipse-outline' },
  { key: 'Cable', label: 'Cable', icon: 'swap-vertical-outline' },
  { key: 'Machine', label: 'Machine', icon: 'cube-outline' },
  { key: 'Plate', label: 'Plate', icon: 'disc-outline' },
  { key: 'Resistance Band', label: 'Resistance Band', icon: 'link-outline' },
  { key: 'Suspension Band', label: 'Suspension Band', icon: 'layers-outline' },
  { key: 'Other', label: 'Other', icon: 'ellipsis-horizontal' },
];

// This app's legacy exercise library was seeded from a free third-party dataset
// (0006_seed_exercise_library.sql) whose equipment strings don't literally match the
// EQUIPMENT_OPTIONS vocabulary above. This loose matcher lets the "All Equipment" filter work
// against that older data without renaming hundreds of seeded rows. Every distinct equipment
// value present in the seed data is accounted for here or matches an option key directly
// (case-insensitively) -- 'cable', for instance, needs no alias since "Cable" is now a real
// option key.
const LEGACY_EQUIPMENT_ALIASES: Record<string, string[]> = {
  None: ['body only'],
  Kettlebell: ['kettlebells'],
  Barbell: ['e-z curl bar'],
  'Resistance Band': ['bands'],
  Other: ['other', 'medicine ball', 'exercise ball', 'foam roll'],
};

export function matchesEquipmentOption(equipment: string | null, optionKey: string): boolean {
  const normalized = (equipment ?? '').toLowerCase();
  if (normalized === optionKey.toLowerCase()) return true;
  return (LEGACY_EQUIPMENT_ALIASES[optionKey] ?? []).includes(normalized);
}

// The muscle-group vocabulary used by both the primary (single-select) and secondary
// (multi-select) muscle pickers when defining an exercise, and by the "All Muscles" filter.
export const MUSCLE_GROUP_OPTIONS: string[] = [
  'Abdominals',
  'Abductors',
  'Adductors',
  'Biceps',
  'Calves',
  'Cardio',
  'Chest',
  'Forearms',
  'Full Body',
  'Glutes',
  'Hamstrings',
  'Lats',
  'Lower Back',
  'Neck',
  'Quadriceps',
  'Shoulders',
  'Traps',
  'Triceps',
  'Upper Back',
  'Other',
];

export interface ExerciseTypeOption {
  key: string;
  label: string;
  example: string;
  metrics: string[];
}

export const EXERCISE_TYPE_OPTIONS: ExerciseTypeOption[] = [
  { key: 'weight_reps', label: 'Weight & Reps', example: 'Bench Press, Dumbbell Curls', metrics: ['Reps', 'Kg'] },
  { key: 'bodyweight_reps', label: 'Bodyweight Reps', example: 'Pullups, Sit ups, Burpees', metrics: ['Reps'] },
  { key: 'weighted_bodyweight', label: 'Weighted Bodyweight', example: 'Weighted Pull Ups, Weighted Dips', metrics: ['Reps', '+Kg'] },
  { key: 'assisted_bodyweight', label: 'Assisted Bodyweight', example: 'Assisted Pullups, Assisted Dips', metrics: ['Reps', '-Kg'] },
  { key: 'duration', label: 'Duration', example: 'Planks, Yoga, Stretching', metrics: ['Time'] },
  { key: 'duration_weight', label: 'Duration & Weight', example: 'Weighted Plank, Wall Sit', metrics: ['Kg', 'Time'] },
  { key: 'distance_duration', label: 'Distance & Duration', example: 'Running, Cycling, Rowing', metrics: ['Time', 'Km'] },
  { key: 'weight_distance', label: 'Weight & Distance', example: 'Farmers Walk, Suitcase Carry', metrics: ['Kg', 'Km'] },
];
