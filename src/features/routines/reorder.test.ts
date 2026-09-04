import { moveUp, moveDown, groupWithPrevious, ungroup } from './reorder';
import type { RoutineExerciseDraft } from './types';

function draft(exerciseId: string, supersetGroup: number | null = null): RoutineExerciseDraft {
  return { exerciseId, exerciseName: exerciseId, targetSets: 3, restSeconds: 90, supersetGroup };
}

describe('moveUp', () => {
  it('swaps an item with the one above it', () => {
    const list = [draft('a'), draft('b'), draft('c')];
    expect(moveUp(list, 1).map((e) => e.exerciseId)).toEqual(['b', 'a', 'c']);
  });

  it('does nothing at index 0', () => {
    const list = [draft('a'), draft('b')];
    expect(moveUp(list, 0)).toEqual(list);
  });
});

describe('moveDown', () => {
  it('swaps an item with the one below it', () => {
    const list = [draft('a'), draft('b'), draft('c')];
    expect(moveDown(list, 1).map((e) => e.exerciseId)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the last index', () => {
    const list = [draft('a'), draft('b')];
    expect(moveDown(list, 1)).toEqual(list);
  });
});

describe('groupWithPrevious', () => {
  it('assigns a new group number to two ungrouped exercises', () => {
    const list = [draft('a'), draft('b')];
    const result = groupWithPrevious(list, 1);
    expect(result[0].supersetGroup).not.toBeNull();
    expect(result[0].supersetGroup).toBe(result[1].supersetGroup);
  });

  it('joins an existing group when the previous exercise already has one', () => {
    const list = [draft('a', 5), draft('b'), draft('c')];
    const result = groupWithPrevious(list, 1);
    expect(result[1].supersetGroup).toBe(5);
  });

  it('does nothing at index 0', () => {
    const list = [draft('a'), draft('b')];
    expect(groupWithPrevious(list, 0)).toEqual(list);
  });

  it('joins an existing earlier group even when a later group has a higher number', () => {
    const list = [draft('a', 1), draft('b', 1), draft('e'), draft('c', 3), draft('d', 3)];
    const result = groupWithPrevious(list, 2);
    expect(result[2].supersetGroup).toBe(1);
  });
});

describe('ungroup', () => {
  it('clears the superset group for one exercise', () => {
    const list = [draft('a', 2), draft('b', 2)];
    const result = ungroup(list, 1);
    expect(result[0].supersetGroup).toBe(2);
    expect(result[1].supersetGroup).toBeNull();
  });
});
