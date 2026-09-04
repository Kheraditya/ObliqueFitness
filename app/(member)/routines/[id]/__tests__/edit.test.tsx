import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../src/features/routines/api', () => ({
  getRoutine: jest.fn(),
  updateRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
}));

jest.mock('../../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'r1' })),
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
}));

import { getRoutine, updateRoutine, deleteRoutine } from '../../../../../src/features/routines/api';
import { getExercise } from '../../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import EditRoutine from '../edit';

describe('EditRoutine', () => {
  it('loads the existing routine, saves changes, and deletes on request', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });
    (updateRoutine as jest.Mock).mockResolvedValue({ error: null });
    (deleteRoutine as jest.Mock).mockResolvedValue({ error: null });

    await render(<EditRoutine />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Routine name'), 'Push Day v2');
    await fireEvent.press(screen.getByText('Save'));

    expect(updateRoutine).toHaveBeenCalledWith('r1', 'Push Day v2', [
      { exerciseId: 'ex1', exerciseName: 'Bench Press', targetSets: 3, restSeconds: 90, supersetGroup: null },
    ]);
    expect(router.replace).toHaveBeenCalledWith('/(member)/routines/r1');

    await fireEvent.press(screen.getByText('Delete Routine'));

    expect(deleteRoutine).toHaveBeenCalledWith('r1');
    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
  });

  it('does not drop an exercise added via addExerciseId when getRoutine resolves after getExercise', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'r1', addExerciseId: 'ex2' });
    // getRoutine resolves on a later macrotask (simulating its real 2-round-trip latency),
    // while getExercise resolves on the very next microtask (its single round trip) — the
    // adverse ordering that previously caused the addExerciseId effect's setExercises to run
    // against a still-empty `exercises` array, which getRoutine's later unconditional
    // setExercises then clobbered.
    (getRoutine as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                id: 'r1',
                name: 'Push Day',
                exercises: [
                  { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
                ],
              }),
            10
          );
        })
    );
    (getExercise as jest.Mock).mockResolvedValue({ id: 'ex2', name: 'Squat' });

    await render(<EditRoutine />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Squat')).toBeTruthy());
  });
});
