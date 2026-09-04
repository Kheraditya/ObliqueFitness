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
};

jest.mock('../../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
  getPersonalRecords: jest.fn().mockResolvedValue({ heaviestWeight: null, best1RM: null, bestSetVolume: null, bestSessionVolume: null }),
  getExerciseHistory: jest.fn().mockResolvedValue([]),
  getLeaderboard: jest.fn().mockResolvedValue([]),
  setLeaderboardOptIn: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'ex-1' }),
}));

import { getExercise } from '../../../../../src/features/exercises/api';
import ExerciseDetail from '../[id]';

describe('ExerciseDetail', () => {
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
});
