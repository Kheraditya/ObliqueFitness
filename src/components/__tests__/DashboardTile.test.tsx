import { render, screen, fireEvent } from '@testing-library/react-native';
import { DashboardTile } from '../DashboardTile';

describe('DashboardTile', () => {
  it('renders the label and calls onPress', async () => {
    const onPress = jest.fn();
    await render(<DashboardTile label="Statistics" icon="stats-chart" onPress={onPress} />);
    expect(screen.getByText('Statistics')).toBeTruthy();
    await fireEvent.press(screen.getByText('Statistics'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<DashboardTile label="Calendar" icon="calendar" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Calendar'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
