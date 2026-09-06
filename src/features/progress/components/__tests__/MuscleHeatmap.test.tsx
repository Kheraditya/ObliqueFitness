import { render, screen } from '@testing-library/react-native';
import { MuscleHeatmap, buildBodyData } from '../MuscleHeatmap';

describe('buildBodyData', () => {
  it('maps a known muscle to its library slug', () => {
    const data = buildBodyData([{ muscle: 'chest', volume: 500 }]);
    expect(data).toEqual([{ slug: 'chest', intensity: 4 }]); // sole entry gets max intensity
  });

  it('combines lats and middle back into the same upper-back slug', () => {
    const data = buildBodyData([
      { muscle: 'lats', volume: 300 },
      { muscle: 'middle back', volume: 200 },
    ]);
    expect(data).toEqual([{ slug: 'upper-back', intensity: 4 }]);
  });

  it('maps hip abductors to the closest visible gluteal region', () => {
    const data = buildBodyData([{ muscle: 'abductors', volume: 999 }]);
    expect(data).toEqual([{ slug: 'gluteal', intensity: 4 }]);
  });

  it('returns an empty array for empty input without crashing', () => {
    expect(buildBodyData([])).toEqual([]);
  });

  it('normalizes custom exercise muscle casing and retains zero-kg activity', () => {
    expect(buildBodyData([{ muscle: ' Chest ', volume: 0 }])).toEqual([{ slug: 'chest', intensity: 1 }]);
  });

  it('gives the highest-volume muscle the top intensity and scales others relative to it', () => {
    const data = buildBodyData([
      { muscle: 'chest', volume: 100 },
      { muscle: 'biceps', volume: 25 },
    ]);
    const chest = data.find((d) => d.slug === 'chest');
    const biceps = data.find((d) => d.slug === 'biceps');
    expect(chest?.intensity).toBe(4);
    expect(biceps?.intensity).toBeLessThan(chest!.intensity!);
    expect(biceps?.intensity).toBeGreaterThanOrEqual(1);
  });
});

describe('MuscleHeatmap', () => {
  it('renders front and back bodies without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[{ muscle: 'chest', volume: 500 }]} />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders with an empty muscleVolumes array without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[]} />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
