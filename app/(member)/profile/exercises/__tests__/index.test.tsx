import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../src/features/exercises/api', () => ({
  listExercises: jest.fn(),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})) }));

import { listExercises } from '../../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import ExerciseList from '../index';

describe('ExerciseList', () => {
  it('renders exercises once loaded', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
      { id: '2', name: 'Squat', primary_muscles: ['quadriceps'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.getByText('Squat')).toBeTruthy();
  });

  it('pushes to returnTo with addExerciseId when in pick mode', async () => {
    (listExercises as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Bench Press', primary_muscles: ['chest'], secondary_muscles: [], equipment: 'barbell', instructions: [], images: [], is_custom: false },
    ]);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pickMode: 'true', returnTo: '/(member)/routines/new' });

    await render(<ExerciseList />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    fireEvent.press(screen.getByText('Bench Press'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/(member)/routines/new', params: { addExerciseId: '1' } });
  });
});
