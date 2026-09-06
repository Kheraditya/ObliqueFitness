import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/auth/api', () => ({ signOut: jest.fn() }));
jest.mock('../../../../src/features/exercises/api', () => ({
  getLeaderboardOptIn: jest.fn(),
  setLeaderboardOptIn: jest.fn(),
}));
jest.mock('../../../../src/features/health/api', () => ({ openHealthAppsSettings: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

import { signOut } from '../../../../src/features/auth/api';
import { getLeaderboardOptIn, setLeaderboardOptIn } from '../../../../src/features/exercises/api';
import { router } from 'expo-router';
import ProfileSettings from '../settings';

describe('ProfileSettings', () => {
  afterEach(async () => {
    await cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getLeaderboardOptIn as jest.Mock).mockResolvedValue(false);
    (setLeaderboardOptIn as jest.Mock).mockResolvedValue({ error: null });
  });

  it('opens edit profile and workout settings', async () => {
    await render(<ProfileSettings />);
    await waitFor(() => expect(screen.getByText('Edit profile')).toBeTruthy());

    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.push).toHaveBeenCalledWith('/(member)/profile/edit');
    await fireEvent.press(screen.getByText('Workout settings'));
    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/settings');
  });

  it('updates leaderboard privacy', async () => {
    const view = await render(<ProfileSettings />);
    await waitFor(() => expect(screen.getByText('Gym leaderboards')).toBeTruthy());
    await fireEvent(view.getByTestId('leaderboard-switch'), 'valueChange', true);
    await waitFor(() => expect(setLeaderboardOptIn).toHaveBeenCalledWith(true));
  });

  it('signs out and returns to the entry screen', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);
    await render(<ProfileSettings />);
    await fireEvent.press(screen.getByText('Sign Out'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });
});
