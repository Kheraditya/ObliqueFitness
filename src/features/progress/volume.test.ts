import { computeVolumeChangePct } from './volume';

describe('computeVolumeChangePct', () => {
  it('computes a positive percentage increase', () => {
    expect(computeVolumeChangePct(150, 100)).toBe(50);
  });

  it('computes a negative percentage decrease', () => {
    expect(computeVolumeChangePct(50, 100)).toBe(-50);
  });

  it('returns null when last week had zero volume (avoids divide-by-zero)', () => {
    expect(computeVolumeChangePct(100, 0)).toBeNull();
  });

  it('returns null when both weeks had zero volume', () => {
    expect(computeVolumeChangePct(0, 0)).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(computeVolumeChangePct(110, 90)).toBe(22.2);
  });
});
