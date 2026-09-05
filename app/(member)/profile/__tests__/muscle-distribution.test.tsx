import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/reports', () => ({
  getPeriodSummary: jest.fn(),
  getSetsCountByMuscle: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getPeriodSummary, getSetsCountByMuscle } from '../../../../src/features/progress/reports';
import { router } from 'expo-router';
import MuscleDistribution from '../muscle-distribution';

beforeEach(() => {
  jest.clearAllMocks();
  (getSetsCountByMuscle as jest.Mock).mockResolvedValue([]);
  (getPeriodSummary as jest.Mock).mockResolvedValue({ workouts: 0, durationSeconds: 0, volume: 0, sets: 0 });
});

describe('MuscleDistribution', () => {
  it('renders the header and range label', async () => {
    await render(<MuscleDistribution />);

    await waitFor(() => expect(screen.getByText('Muscle distribution')).toBeTruthy());
    expect(screen.getByText('Last 30 days')).toBeTruthy();
  });

  it('shows current and previous period comparisons', async () => {
    (getPeriodSummary as jest.Mock).mockResolvedValueOnce({ workouts: 5, durationSeconds: 3000, volume: 2000, sets: 40 });
    (getPeriodSummary as jest.Mock).mockResolvedValueOnce({ workouts: 2, durationSeconds: 1200, volume: 800, sets: 15 });

    await render(<MuscleDistribution />);

    await waitFor(() => expect(screen.getByText('5')).toBeTruthy());
    expect(screen.getByText('→ 2')).toBeTruthy();
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<MuscleDistribution />);
    await waitFor(() => expect(screen.getByText('Muscle distribution')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
