import { render, screen } from '@testing-library/react-native';
import { ComparisonStatTile } from '../ComparisonStatTile';

describe('ComparisonStatTile', () => {
  it('renders the label, current value, and previous value', async () => {
    await render(<ComparisonStatTile label="Workouts" value="3" previousValue="1" />);

    expect(screen.getByText('Workouts')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('→ 1')).toBeTruthy();
  });
});
