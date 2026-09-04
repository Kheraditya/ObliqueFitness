import { shouldStartRestTimer } from './restTimer';
import type { SessionExercise } from './types';

function exercise(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    exerciseId: 'ex-1',
    exerciseName: 'Bench Press',
    order: 0,
    restSeconds: 90,
    supersetGroup: null,
    ...overrides,
  };
}

describe('shouldStartRestTimer', () => {
  it('returns true for a standalone exercise followed by another standalone exercise', () => {
    const list = [exercise({ exerciseId: 'a' }), exercise({ exerciseId: 'b' })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });

  it('returns false when the next exercise shares the same superset group', () => {
    const list = [
      exercise({ exerciseId: 'a', supersetGroup: 1 }),
      exercise({ exerciseId: 'b', supersetGroup: 1 }),
    ];
    expect(shouldStartRestTimer(list, 0)).toBe(false);
  });

  it('returns true for the last exercise in a superset group (next is a different group)', () => {
    const list = [
      exercise({ exerciseId: 'a', supersetGroup: 1 }),
      exercise({ exerciseId: 'b', supersetGroup: 1 }),
      exercise({ exerciseId: 'c', supersetGroup: 2 }),
    ];
    expect(shouldStartRestTimer(list, 1)).toBe(true);
  });

  it('returns true for the last exercise in the whole list', () => {
    const list = [exercise({ exerciseId: 'a' })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });

  it('returns true when the current exercise has no superset group, even if unrelated data looks odd', () => {
    const list = [exercise({ exerciseId: 'a', supersetGroup: null }), exercise({ exerciseId: 'b', supersetGroup: 2 })];
    expect(shouldStartRestTimer(list, 0)).toBe(true);
  });
});
