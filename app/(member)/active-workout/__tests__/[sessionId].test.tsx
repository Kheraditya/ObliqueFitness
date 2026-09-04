import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';

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
import { getExercise } from '../../../../src/features/exercises/api';
import { router, useLocalSearchParams } from 'expo-router';
import ActiveWorkout from '../[sessionId]';

describe('ActiveWorkout', () => {
  afterEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ sessionId: 's1' });
  });

  it('loads session exercises and logs a set', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (logSet as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('-'), '100');
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

  it('does not create a duplicate entry when the picked exercise is already in the session', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ sessionId: 's1', addExerciseId: 'ex1' });
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (getExercise as jest.Mock).mockResolvedValue({ id: 'ex1', name: 'Bench Press' });

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    await waitFor(() => expect(getExercise).toHaveBeenCalledWith('ex1'));
    await waitFor(() => expect(router.setParams).toHaveBeenCalledWith({ addExerciseId: undefined }));

    expect(screen.getAllByText('Bench Press')).toHaveLength(1);
  });

  it('restarts the rest timer countdown when logging a second set for the same exercise', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 100, reps: 5, rpe: null }])
      .mockResolvedValueOnce([
        { id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 100, reps: 5, rpe: null },
        { id: 'set2', exerciseId: 'ex1', setNumber: 2, weight: 100, reps: 5, rpe: null },
      ]);
    (logSet as jest.Mock).mockResolvedValue({ error: null });

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());

    jest.useFakeTimers();
    try {
      await fireEvent.changeText(screen.getByPlaceholderText('-'), '100');
      await fireEvent.changeText(screen.getByPlaceholderText('reps'), '5');
      await act(async () => {
        await fireEvent.press(screen.getByText('Add Set'));
      });

      expect(screen.getByText('Resting: 90s')).toBeTruthy();

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByText('Resting: 85s')).toBeTruthy();

      await fireEvent.changeText(screen.getByPlaceholderText('-'), '100');
      await fireEvent.changeText(screen.getByPlaceholderText('reps'), '5');
      await act(async () => {
        await fireEvent.press(screen.getByText('Add Set'));
      });

      // Without the restKey remount fix, this would still read 'Resting: 85s'
      // (or continue counting down from there) because setRestSeconds(90) is a
      // no-op state update when the value is numerically unchanged.
      expect(screen.getByText('Resting: 90s')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
