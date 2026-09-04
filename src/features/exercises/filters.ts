import type { Exercise } from './types';

export interface ExerciseFilters {
  search: string;
  equipment: string | null;
  muscle: string | null;
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  if (!query.trim()) return true;
  return exercise.name.toLowerCase().includes(query.trim().toLowerCase());
}

function matchesEquipment(exercise: Exercise, equipment: string | null): boolean {
  if (!equipment) return true;
  return exercise.equipment === equipment;
}

function matchesMuscle(exercise: Exercise, muscle: string | null): boolean {
  if (!muscle) return true;
  return exercise.primary_muscles.includes(muscle) || exercise.secondary_muscles.includes(muscle);
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  return exercises.filter(
    (e) => matchesSearch(e, filters.search) && matchesEquipment(e, filters.equipment) && matchesMuscle(e, filters.muscle)
  );
}
