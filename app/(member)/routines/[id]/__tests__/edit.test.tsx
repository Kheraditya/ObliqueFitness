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
import { router } from 'expo-router';
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
});
