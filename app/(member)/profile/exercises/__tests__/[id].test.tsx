import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

const mockExercise = {
  id: 'ex-1',
  name: 'Bench Press',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps'],
  equipment: 'barbell',
  instructions: ['Lie on the bench.', 'Press the bar up.'],
  images: [],
  is_custom: false,
  exercise_type: null,
};

jest.mock('../../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
  getPersonalRecords: jest.fn().mockResolvedValue({ heaviestWeight: null, best1RM: null, bestSetVolume: null, bestSessionVolume: null }),
  getStrengthTrend: jest.fn().mockResolvedValue([]),
  getExerciseHistory: jest.fn().mockResolvedValue([]),
  getLeaderboard: jest.fn().mockResolvedValue([]),
  getLeaderboardOptIn: jest.fn().mockResolvedValue(false),
  setLeaderboardOptIn: jest.fn(),
}));

const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'ex-1' })),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

import { getExercise, getLeaderboard, getLeaderboardOptIn } from '../../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import ExerciseDetail from '../[id]';

describe('ExerciseDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'ex-1' });
  });

  it('dismisses back to the existing exercise list instance with no extra params, outside pick mode', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/(member)/profile/exercises', params: {} });
    expect(router.push).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('dismisses back to the existing list instance, re-supplying pickMode/returnTo so dismissTo does not wipe them off it', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'ex-1',
      pickMode: 'true',
      callerReturnTo: '/(member)/active-workout/s1',
    });
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.dismissTo).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises',
      params: { pickMode: 'true', returnTo: '/(member)/active-workout/s1' },
    });
  });

  it('disables the swipe-back gesture when opened in pick mode (the cross-tab entry that makes it unreliable)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'ex-1', pickMode: 'true' });
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: false });
  });

  it('leaves the swipe-back gesture enabled for normal, same-tab browsing', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
  });

  it('shows a back button even while the exercise is still loading', async () => {
    (getExercise as jest.Mock).mockResolvedValue(new Promise(() => {}));

    await render(<ExerciseDetail />);

    expect(screen.getByTestId('back-button')).toBeTruthy();
  });

  it('renders the exercise name and defaults to the Summary tab', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Primary: chest')).toBeTruthy();
  });

  it('shows instructions when the How to tab is selected', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    fireEvent.press(screen.getByText('How to'));

    await waitFor(() => expect(screen.getByText('Lie on the bench.')).toBeTruthy());
  });

  it('shows leaderboard entries when the Leaderboard tab is selected', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);
    (getLeaderboard as jest.Mock).mockResolvedValue([{ userId: 'u1', name: 'Alex', heaviestWeight: 120 }]);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByText('Leaderboard'));

    await waitFor(() => expect(screen.getByText('1. Alex')).toBeTruthy());
  });

  it('hides the opt-in button when the user is already opted in to leaderboards', async () => {
    (getExercise as jest.Mock).mockResolvedValue(mockExercise);
    (getLeaderboard as jest.Mock).mockResolvedValue([{ userId: 'u1', name: 'Alex', heaviestWeight: 120 }]);
    (getLeaderboardOptIn as jest.Mock).mockResolvedValue(true);

    await render(<ExerciseDetail />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.press(screen.getByText('Leaderboard'));

    await waitFor(() => expect(screen.getByText('1. Alex')).toBeTruthy());
    expect(screen.queryByText('Show me on leaderboards')).toBeNull();
  });
});
