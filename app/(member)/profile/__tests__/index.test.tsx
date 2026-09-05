import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({
  signOut: jest.fn(),
  getCurrentUserProfile: jest.fn(),
}));

jest.mock('../../../../src/features/workout/api', () => ({
  getWorkoutSummary: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

import { getCurrentUserProfile } from '../../../../src/features/auth/api';
import { getWorkoutSummary } from '../../../../src/features/workout/api';
import { router } from 'expo-router';
import ProfileHome from '../index';

beforeEach(() => {
  jest.clearAllMocks();
  (getCurrentUserProfile as jest.Mock).mockResolvedValue({
    id: 'u1',
    email: 'a@b.com',
    role: 'member',
    gym_id: null,
    name: 'Aditya',
    avatar_url: null,
  });
  (getWorkoutSummary as jest.Mock).mockResolvedValue({ count: 0, recent: [] });
});

describe('ProfileHome', () => {
  it('renders the real profile name and workout count', async () => {
    (getWorkoutSummary as jest.Mock).mockResolvedValue({ count: 3, recent: [] });

    await render(<ProfileHome />);

    await waitFor(() => expect(screen.getByText('Aditya')).toBeTruthy());
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows the empty state when there are no recent sessions', async () => {
    await render(<ProfileHome />);

    await waitFor(() => expect(screen.getByText('No workouts')).toBeTruthy());
  });

  it('shows recent sessions when there are some', async () => {
    (getWorkoutSummary as jest.Mock).mockResolvedValue({
      count: 1,
      recent: [{ id: 's1', startedAt: '2026-09-03T00:00:00Z', durationSeconds: 1800 }],
    });

    await render(<ProfileHome />);

    await waitFor(() => expect(screen.getByText('2026-09-03')).toBeTruthy());
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.queryByText('No workouts')).toBeNull();
  });

  it('navigates to Statistics when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Statistics'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/statistics');
  });

  it('navigates to Measures when pressed', async () => {
    await render(<ProfileHome />);
    await fireEvent.press(screen.getByText('Measures'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/measures');
  });

  it('navigates to Workout tab when "Start tracking here" is pressed', async () => {
    await render(<ProfileHome />);
    await waitFor(() => expect(screen.getByText('Start tracking here')).toBeTruthy());
    await fireEvent.press(screen.getByText('Start tracking here'));
    expect(router.push).toHaveBeenCalledWith('/(member)/workout');
  });
});
