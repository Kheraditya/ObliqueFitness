import { render, screen } from '@testing-library/react-native';
import { RadarChart, pointFor, polygonPoints } from '../RadarChart';
import type { MuscleGroup } from '../../muscleGroups';

const zeroValues: Record<MuscleGroup, number> = { Back: 0, Chest: 0, Legs: 0, Core: 0, Shoulders: 0, Arms: 0 };

describe('pointFor', () => {
  it('places index 0 directly above the center at fraction 1 (top of the hexagon)', () => {
    const p = pointFor(0, 1);
    expect(p.x).toBeCloseTo(130); // CENTER
    expect(p.y).toBeCloseTo(40); // CENTER - RADIUS
  });

  it('collapses to the center at fraction 0', () => {
    const p = pointFor(2, 0);
    expect(p.x).toBeCloseTo(130);
    expect(p.y).toBeCloseTo(130);
  });
});

describe('polygonPoints', () => {
  it('does not divide by zero when max is 0', () => {
    const points = polygonPoints(zeroValues, 0);
    // Every group is at fraction 0 -> every point collapses to the center (130,130).
    for (const pair of points.split(' ')) {
      const [x, y] = pair.split(',').map(Number);
      expect(x).toBeCloseTo(130);
      expect(y).toBeCloseTo(130);
    }
  });

  it('produces 6 comma-separated coordinate pairs', () => {
    const points = polygonPoints({ ...zeroValues, Chest: 5 }, 10);
    expect(points.split(' ')).toHaveLength(6);
  });
});

describe('RadarChart', () => {
  it('renders the legend and axis labels without crashing', async () => {
    await render(<RadarChart current={{ ...zeroValues, Chest: 5 }} previous={zeroValues} />);

    expect(screen.getByText('Current')).toBeTruthy();
    expect(screen.getByText('Previous')).toBeTruthy();
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders with all-zero data (both periods) without crashing', async () => {
    await render(<RadarChart current={zeroValues} previous={zeroValues} />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
