import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../../../src/features/progress/api', () => ({
  getHomeSummary: jest.fn(),
}));

import { getHomeSummary } from '../../../src/features/progress/api';
import Home from '../home';

describe('Home', () => {
  it('renders the workout count, volume change, streak, and top muscles', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({
      workoutCountThisWeek: 3,
      volumeChangePct: 12.5,
      streakDays: 4,
      muscleVolumes: [
        { muscle: 'chest', volume: 500 },
        { muscle: 'legs', volume: 300 },
      ],
    });

    await render(<Home />);

    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(screen.getByText('+12.5%')).toBeTruthy();
    expect(screen.getByText('4d')).toBeTruthy();
    expect(screen.getByText('chest')).toBeTruthy();
  });

  it('shows a placeholder message when there is no muscle volume data yet', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({
      workoutCountThisWeek: 0,
      volumeChangePct: null,
      streakDays: 0,
      muscleVolumes: [],
    });

    await render(<Home />);

    await waitFor(() => expect(screen.getByText('Log a workout to see your muscle balance.')).toBeTruthy());
    expect(screen.getByText('–')).toBeTruthy();
  });
});
