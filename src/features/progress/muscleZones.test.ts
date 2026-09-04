import { zoneVolumes } from './muscleZones';

describe('zoneVolumes', () => {
  it('folds lats and middle back into the shared upperBack zone', () => {
    const result = zoneVolumes([
      { muscle: 'lats', volume: 100 },
      { muscle: 'middle back', volume: 50 },
    ]);
    expect(result.upperBack).toBe(150);
  });

  it('maps single-muscle zones directly', () => {
    const result = zoneVolumes([{ muscle: 'chest', volume: 200 }]);
    expect(result.chest).toBe(200);
  });

  it('ignores an unknown muscle string', () => {
    const result = zoneVolumes([{ muscle: 'unknown_muscle', volume: 999 }]);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('returns 0 for every zone with no matching muscle', () => {
    const result = zoneVolumes([{ muscle: 'chest', volume: 200 }]);
    expect(result.hamstrings).toBe(0);
    expect(result.calves).toBe(0);
  });

  it('returns all 16 zone keys even with empty input', () => {
    const result = zoneVolumes([]);
    expect(Object.keys(result).sort()).toEqual(
      [
        'abductors', 'abs', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'glutes',
        'hamstrings', 'lowerBack', 'neck', 'quads', 'shoulders', 'traps', 'triceps', 'upperBack',
      ].sort()
    );
  });
});
