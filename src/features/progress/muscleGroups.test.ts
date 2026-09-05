import { groupCounts } from './muscleGroups';

describe('groupCounts', () => {
  it('folds lats, middle back, lower back, and traps into Back', () => {
    const result = groupCounts([
      { muscle: 'lats', sets: 3 },
      { muscle: 'middle back', sets: 2 },
      { muscle: 'lower back', sets: 1 },
      { muscle: 'traps', sets: 4 },
    ]);
    expect(result.Back).toBe(10);
  });

  it('maps single-muscle groups directly', () => {
    const result = groupCounts([{ muscle: 'chest', sets: 5 }]);
    expect(result.Chest).toBe(5);
  });

  it('ignores an unrecognized muscle string', () => {
    const result = groupCounts([{ muscle: 'unknown_muscle', sets: 99 }]);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('returns all 6 groups even with empty input', () => {
    const result = groupCounts([]);
    expect(Object.keys(result).sort()).toEqual(['Arms', 'Back', 'Chest', 'Core', 'Legs', 'Shoulders'].sort());
  });
});
