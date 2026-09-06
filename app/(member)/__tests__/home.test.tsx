import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

jest.mock('../../../src/features/progress/api', () => ({
  getHomeSummary: jest.fn(),
}));

jest.mock('../../../src/features/health/api', () => ({
  getDailyHealthSummary: jest.fn(),
  connectHealthApps: jest.fn(),
  openHealthAppsSettings: jest.fn(),
  openHealthConnectStore: jest.fn(),
}));

import { getHomeSummary } from '../../../src/features/progress/api';
import { connectHealthApps, getDailyHealthSummary } from '../../../src/features/health/api';
import Home from '../home';

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDailyHealthSummary as jest.Mock).mockResolvedValue({
      status: 'disconnected', steps: null, distanceKm: null, activeCalories: null,
      averageHeartRate: null, sleepMinutes: null, sources: [], error: null,
    });
  });

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
  it('shows connected health metrics on the home screen', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({ workoutCountThisWeek: 0, volumeChangePct: null, streakDays: 0, muscleVolumes: [] });
    (getDailyHealthSummary as jest.Mock).mockResolvedValue({
      status: 'connected', steps: 8432, distanceKm: 6.25, activeCalories: 480,
      averageHeartRate: 72, sleepMinutes: 457, sources: ['com.health.app'], error: null,
    });

    await render(<Home />);
    await waitFor(() => expect(screen.getByText('8,432')).toBeTruthy());
    expect(screen.getByText('6.3 km')).toBeTruthy();
    expect(screen.getByText('480 kcal')).toBeTruthy();
    expect(screen.getByText('72 bpm')).toBeTruthy();
    expect(screen.getByText('7h 37m')).toBeTruthy();
  });

  it('requests health permissions when Connect is pressed', async () => {
    (getHomeSummary as jest.Mock).mockResolvedValue({ workoutCountThisWeek: 0, volumeChangePct: null, streakDays: 0, muscleVolumes: [] });
    (connectHealthApps as jest.Mock).mockResolvedValue({
      status: 'connected', steps: 1000, distanceKm: 0.8, activeCalories: 90,
      averageHeartRate: null, sleepMinutes: null, sources: [], error: null,
    });

    await render(<Home />);
    await waitFor(() => expect(screen.getByText('Connect')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Connect'));
    });
    await waitFor(() => expect(connectHealthApps).toHaveBeenCalledTimes(1));
    expect(screen.getByText('1,000')).toBeTruthy();
  });
});
