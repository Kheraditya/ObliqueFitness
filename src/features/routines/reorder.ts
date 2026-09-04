import type { RoutineExerciseDraft } from './types';

export function moveUp(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index <= 0) return list;
  const next = [...list];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function moveDown(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index >= list.length - 1) return list;
  const next = [...list];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

export function groupWithPrevious(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  if (index <= 0) return list;
  const next = [...list];
  const prevGroup = next[index - 1].supersetGroup;
  const maxGroup = Math.max(0, ...next.map((e) => e.supersetGroup ?? 0));

  // If previous is grouped and is the highest group, join it
  // Otherwise, create a new group
  const groupId = prevGroup !== null && prevGroup === maxGroup ? prevGroup : maxGroup + 1;
  next[index - 1] = { ...next[index - 1], supersetGroup: groupId };
  next[index] = { ...next[index], supersetGroup: groupId };
  return next;
}

export function ungroup(list: RoutineExerciseDraft[], index: number): RoutineExerciseDraft[] {
  const next = [...list];
  next[index] = { ...next[index], supersetGroup: null };
  return next;
}
