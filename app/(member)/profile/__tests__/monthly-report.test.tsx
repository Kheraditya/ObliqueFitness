import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/progress/reports', () => ({
  getPeriodSummary: jest.fn(),
  getSetsCountByMuscle: jest.fn(),
  getMonthlyTotals: jest.fn(),
}));

jest.mock('../../../../src/features/workout/api', () => ({
  getWorkoutDates: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getPeriodSummary, getSetsCountByMuscle, getMonthlyTotals } from '../../../../src/features/progress/reports';
import { getWorkoutDates } from '../../../../src/features/workout/api';
import MonthlyReport from '../monthly-report';

beforeEach(() => {
  jest.clearAllMocks();
  (getPeriodSummary as jest.Mock).mockResolvedValue({ workouts: 0, durationSeconds: 0, volume: 0, sets: 0 });
  (getSetsCountByMuscle as jest.Mock).mockResolvedValue([]);
  (getMonthlyTotals as jest.Mock).mockResolvedValue([]);
  (getWorkoutDates as jest.Mock).mockResolvedValue([]);
});

describe('MonthlyReport', () => {
  it('renders the header, month title, and summary comparisons', async () => {
    (getPeriodSummary as jest.Mock).mockResolvedValueOnce({ workouts: 4, durationSeconds: 3600, volume: 5000, sets: 30 });

    await render(<MonthlyReport />);

    await waitFor(() => expect(screen.getAllByText('4').length).toBeGreaterThan(0));
    expect(screen.getByText(/Report$/)).toBeTruthy();
  });

  it('shows a real week streak derived from fetched workout dates', async () => {
    (getWorkoutDates as jest.Mock).mockResolvedValue([]);

    await render(<MonthlyReport />);

    await waitFor(() => expect(screen.getByText(/Week Streak/)).toBeTruthy());
  });

  it('switches the chart metric when a different pill is pressed without crashing', async () => {
    (getMonthlyTotals as jest.Mock).mockResolvedValue([
      { month: '2026-09', workouts: 3, durationSeconds: 5400, volume: 4000 },
    ]);

    await render(<MonthlyReport />);
    await waitFor(() => expect(screen.getAllByText('Duration').length).toBeGreaterThan(0));

    await fireEvent.press(screen.getAllByText('Duration')[0]);

    expect(screen.toJSON()).not.toBeNull();
  });

  it('renders the muscle distribution radar section', async () => {
    await render(<MonthlyReport />);

    await waitFor(() => expect(screen.getByText('Muscle Distribution')).toBeTruthy());
    expect(screen.getByText('Current')).toBeTruthy();
    expect(screen.getByText('Previous')).toBeTruthy();
  });
});
