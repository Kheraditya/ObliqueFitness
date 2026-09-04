import { render, screen, fireEvent } from '@testing-library/react-native';
import { MuscleHeatmap, interpolateColor } from '../MuscleHeatmap';

describe('interpolateColor', () => {
  it('returns the cold color at t=0', () => {
    expect(interpolateColor(0)).toBe('rgb(44, 44, 46)');
  });

  it('returns the hot color at t=1', () => {
    expect(interpolateColor(1)).toBe('rgb(10, 132, 255)');
  });
});

describe('MuscleHeatmap', () => {
  it('renders the front view by default without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[{ muscle: 'chest', volume: 500 }]} />);
    expect(screen.getByText('Front')).toBeTruthy();
    expect(screen.toJSON()).not.toBeNull();
  });

  it('switches to the back view when pressed', async () => {
    await render(<MuscleHeatmap muscleVolumes={[{ muscle: 'glutes', volume: 300 }]} />);
    await fireEvent.press(screen.getByText('Back'));
    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders with an empty muscleVolumes array without crashing', async () => {
    await render(<MuscleHeatmap muscleVolumes={[]} />);
    expect(screen.toJSON()).not.toBeNull();
  });
});
