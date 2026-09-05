import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../../../src/features/workout/api', () => ({
  getSessionExercises: jest.fn(),
  getLoggedSets: jest.fn(),
  logSet: jest.fn(),
  updateWorkoutSet: jest.fn(),
  finishSession: jest.fn(),
  discardSession: jest.fn(),
}));

jest.mock('../../../../src/features/exercises/api', () => ({
  getExercise: jest.fn(),
}));

jest.mock('../../../../src/features/workout/settings', () => ({
  getWorkoutSettings: jest.fn().mockResolvedValue({
    keepAwake: false,
    plateCalculator: true,
    rpeTracking: true,
    smartSupersetScrolling: false,
    inlineTimer: true,
    livePrNotification: true,
  }),
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ sessionId: 's1' })),
}));

import { getSessionExercises, getLoggedSets, logSet, finishSession, discardSession } from '../../../../src/features/workout/api';
import { getExercise } from '../../../../src/features/exercises/api';
import { getWorkoutSettings } from '../../../../src/features/workout/settings';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import ActiveWorkout from '../[sessionId]';

describe('ActiveWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks wipes call history but not the module-mock-factory default resolved
    // value below, so re-establish it explicitly for tests that don't override it themselves.
    (getWorkoutSettings as jest.Mock).mockResolvedValue({
      keepAwake: false,
      plateCalculator: true,
      rpeTracking: true,
      smartSupersetScrolling: false,
      inlineTimer: true,
      livePrNotification: true,
    });
  });

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

    await fireEvent.changeText(screen.getAllByPlaceholderText('-')[0], '100');
    await fireEvent.changeText(screen.getAllByPlaceholderText('-')[1], '5');
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
      await fireEvent.changeText(screen.getAllByPlaceholderText('-')[0], '100');
      await fireEvent.changeText(screen.getAllByPlaceholderText('-')[1], '5');
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

      await fireEvent.changeText(screen.getAllByPlaceholderText('-')[0], '100');
      await fireEvent.changeText(screen.getAllByPlaceholderText('-')[1], '5');
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

  it('shows the "Get started" empty state when there are no exercises yet', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Get started')).toBeTruthy());
    expect(screen.getByText('Add an exercise to start your workout')).toBeTruthy();
  });

  it('does not show the empty state once an exercise has been added', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.queryByText('Get started')).toBeNull();
  });

  it('shows the current volume and set count from logged sets', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([
      { id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 100, reps: 5, rpe: null },
      { id: 'set2', exerciseId: 'ex1', setNumber: 2, weight: 50, reps: 10, rpe: null },
    ]);

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('1000 kg')).toBeTruthy()); // 100*5 + 50*10
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Sets count (also appears as a set-number badge)
  });

  it('discards the session and navigates back when Discard Workout is confirmed', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    (discardSession as jest.Mock).mockResolvedValue({ error: null });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Discard')?.onPress?.();
    });

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Discard Workout')).toBeTruthy());

    await fireEvent.press(screen.getByText('Discard Workout'));

    await waitFor(() => expect(discardSession).toHaveBeenCalledWith('s1'));
    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
    alertSpy.mockRestore();
  });

  it('does not discard the session unless the confirmation dialog is confirmed', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Discard Workout')).toBeTruthy());

    await fireEvent.press(screen.getByText('Discard Workout'));

    expect(alertSpy).toHaveBeenCalled();
    expect(discardSession).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('navigates to workout settings when Settings is pressed', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    await render(<ActiveWorkout />);
    await waitFor(() => expect(screen.getByText('Settings')).toBeTruthy());

    await fireEvent.press(screen.getByText('Settings'));

    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/settings');
  });

  it('hides the RPE column when the RPE Tracking setting is off', async () => {
    (getWorkoutSettings as jest.Mock).mockResolvedValueOnce({
      keepAwake: false,
      plateCalculator: true,
      rpeTracking: false,
      smartSupersetScrolling: false,
      inlineTimer: true,
      livePrNotification: true,
    });
    (getSessionExercises as jest.Mock).mockResolvedValue({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    await render(<ActiveWorkout />);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeTruthy());
    expect(screen.queryByText('RPE')).toBeNull();
  });

  it('activates keep-awake when the Keep Awake setting is on, and deactivates it on unmount', async () => {
    (getWorkoutSettings as jest.Mock).mockResolvedValueOnce({
      keepAwake: true,
      plateCalculator: true,
      rpeTracking: true,
      smartSupersetScrolling: false,
      inlineTimer: true,
      livePrNotification: true,
    });
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    const { unmount } = await render(<ActiveWorkout />);

    await waitFor(() => expect(activateKeepAwakeAsync).toHaveBeenCalledWith('active-workout'));

    await act(async () => {
      unmount();
    });
    expect(deactivateKeepAwake).toHaveBeenCalledWith('active-workout');
  });

  it('does not activate keep-awake when the setting is off', async () => {
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    await render(<ActiveWorkout />);

    await waitFor(() => expect(getWorkoutSettings).toHaveBeenCalled());
    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });

  it('does not activate keep-awake if the component unmounts before settings resolve', async () => {
    let resolveSettings: (value: unknown) => void = () => {};
    (getWorkoutSettings as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSettings = resolve;
      })
    );
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (getLoggedSets as jest.Mock).mockResolvedValue([]);

    const { unmount } = await render(<ActiveWorkout />);
    await act(async () => {
      unmount();
    });

    await act(async () => {
      resolveSettings({
        keepAwake: true,
        plateCalculator: true,
        rpeTracking: true,
        smartSupersetScrolling: false,
        inlineTimer: true,
        livePrNotification: true,
      });
    });

    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });
});
