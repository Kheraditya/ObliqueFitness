import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/exercises/api', () => ({ getLoggedExercises: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

import { getLoggedExercises } from '../../../../src/features/exercises/api';
import { router } from 'expo-router';
import LeaderboardExercises from '../leaderboard-exercises';

describe('LeaderboardExercises', () => {
  it('opens the selected exercise directly on its leaderboard', async () => {
    (getLoggedExercises as jest.Mock).mockResolvedValue([{ id: 'e1', name: 'Bench Press' }]);
    await render(<LeaderboardExercises />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    fireEvent.press(screen.getByText('Bench Press'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises/e1',
      params: { initialTab: 'leaderboard' },
    });
  });
});
