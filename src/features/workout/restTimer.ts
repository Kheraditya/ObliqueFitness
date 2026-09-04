import type { SessionExercise } from './types';

export function shouldStartRestTimer(exercises: SessionExercise[], currentIndex: number): boolean {
  const current = exercises[currentIndex];
  const next = exercises[currentIndex + 1];
  if (!next) return true;
  if (current.supersetGroup != null && next.supersetGroup === current.supersetGroup) {
    return false;
  }
  return true;
}
