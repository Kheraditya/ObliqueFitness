import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  createRoutine: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

import { createRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import { useLocalSearchParams, router } from 'expo-router';
import NewRoutine from '../new';

describe('NewRoutine', () => {
  it('adds an exercise passed via addExerciseId and saves the routine', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ addExerciseId: 'ex1' });
    (getExercise as jest.Mock).mockResolvedValue({ id: 'ex1', name: 'Bench Press' });
    (createRoutine as jest.Mock).mockResolvedValue({ id: 'r1', error: null });

    await render(<NewRoutine />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Routine title'), 'Push Day');
    await fireEvent.press(screen.getByText('Save'));

    expect(createRoutine).toHaveBeenCalledWith('Push Day', [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
    ]);
    expect(router.replace).toHaveBeenCalledWith('/(member)/routines/r1');
  });

  it('shows an error and does not navigate when createRoutine partially fails', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (createRoutine as jest.Mock).mockResolvedValue({ id: 'r1', error: 'insert failed' });

    await render(<NewRoutine />);

    (router.replace as jest.Mock).mockClear();

    await fireEvent.changeText(screen.getByPlaceholderText('Routine title'), 'Push Day');
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText('insert failed')).toBeTruthy());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the empty state and navigates to the exercise picker when Add exercise is pressed', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    await render(<NewRoutine />);

    expect(screen.getByText('Get started by adding an exercise to your routine.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Add exercise'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/profile/exercises',
      params: { pickMode: 'true', returnTo: '/(member)/routines/new' },
    });
  });

  it('navigates back when Cancel is pressed', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    await render(<NewRoutine />);
    await fireEvent.press(screen.getByText('Cancel'));

    expect(router.back).toHaveBeenCalled();
  });
});
