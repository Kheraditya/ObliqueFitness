import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  createRoutine: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
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

    await fireEvent.changeText(screen.getByPlaceholderText('Routine name'), 'Push Day');
    await fireEvent.press(screen.getByText('Save'));

    expect(createRoutine).toHaveBeenCalledWith('Push Day', [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
    ]);
    expect(router.replace).toHaveBeenCalledWith('/(member)/routines/r1');
  });
});
