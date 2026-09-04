import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/workout/api', () => ({
  getSessionExercises: jest.fn(),
  getLoggedSets: jest.fn(),
  logSet: jest.fn(),
  updateWorkoutSet: jest.fn(),
  finishSession: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ sessionId: 's1' })),
}));

import { getSessionExercises, getLoggedSets, logSet, finishSession } from '../../../../src/features/workout/api';
import { router } from 'expo-router';
import ActiveWorkout from '../[sessionId]';

describe('ActiveWorkout', () => {
  it('loads session exercises and logs a set', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (logSet as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('kg'), '100');
    await fireEvent.changeText(screen.getByPlaceholderText('reps'), '5');
    await fireEvent.press(screen.getByText('Add Set'));

    expect(logSet).toHaveBeenCalledWith('s1', 'ex1', 1, 100, 5, null);
  });

  it('finishes the session and navigates back', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (finishSession as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Finish')).toBeTruthy());

    await fireEvent.press(screen.getByText('Finish'));

    expect(finishSession).toHaveBeenCalledWith('s1', '2026-09-04T00:00:00Z');
    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
  });
});
