import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../../src/features/routines/api', () => ({
  listRoutines: jest.fn(),
  deleteRoutine: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../../../src/features/workout/api', () => ({
  startSession: jest.fn(),
  getActiveSession: jest.fn(),
  getSessionExercises: jest.fn(),
  discardSession: jest.fn(),
}));

import { listRoutines, deleteRoutine } from '../../../src/features/routines/api';
import { startSession, getActiveSession, getSessionExercises, discardSession } from '../../../src/features/workout/api';
import { router } from 'expo-router';
import Workout from '../workout';

describe('Workout', () => {
  beforeEach(() => {
    (getActiveSession as jest.Mock).mockResolvedValue(null);
  });

  it('renders the routines list once loaded, with a count in the My Routines label', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
    expect(screen.getByText('My Routines (1)')).toBeTruthy();
  });

  it('renders the exercise preview beneath a routine name', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'Push Day', exercisePreview: 'Bench Press, Overhead Press' },
    ]);

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('Bench Press, Overhead Press')).toBeTruthy());
  });

  it('collapses and expands the routines list when the My Routines row is pressed', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByText('My Routines (1)'));
    expect(screen.queryByText('Push Day')).toBeNull();

    await fireEvent.press(screen.getByText('My Routines (1)'));
    expect(screen.getByText('Push Day')).toBeTruthy();
  });

  it('starts an empty session and navigates to it when "Start Empty Workout" is pressed', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (startSession as jest.Mock).mockResolvedValue({ id: 's1', error: null });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Start Empty Workout')).toBeTruthy());

    await fireEvent.press(screen.getByText('Start Empty Workout'));

    expect(startSession).toHaveBeenCalledWith(null);
    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s1');
  });

  it('shows an error and does not navigate when starting a session fails', async () => {
    (router.push as jest.Mock).mockClear();
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (startSession as jest.Mock).mockResolvedValue({ id: null, error: 'Not authenticated' });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Start Empty Workout')).toBeTruthy());

    await fireEvent.press(screen.getByText('Start Empty Workout'));

    await waitFor(() => expect(screen.getByText('Not authenticated')).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('starts a session for a specific routine when its Start Routine button is pressed', async () => {
    (router.push as jest.Mock).mockClear();
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);
    (startSession as jest.Mock).mockResolvedValue({ id: 's2', error: null });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByText('Start Routine'));

    expect(startSession).toHaveBeenCalledWith('r1');
    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s2');
  });

  it('navigates to the edit screen when Edit Routine is chosen from a routine card menu', async () => {
    (router.push as jest.Mock).mockClear();
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Edit Routine')?.onPress?.();
    });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('routine-menu-Push Day'));

    expect(router.push).toHaveBeenCalledWith('/(member)/routines/r1/edit');
    alertSpy.mockRestore();
  });

  it('deletes the routine and refreshes the list when Delete Routine is chosen from the menu', async () => {
    // The test's useFocusEffect mock re-invokes refresh() on every re-render (unlike the real
    // hook, which only fires on focus), so listRoutines may be called more than once before the
    // delete happens. Key the response off whether deleteRoutine has run yet, rather than call
    // order, so extra incidental refreshes don't consume a mockResolvedValueOnce meant for later.
    // Reuse the same array references across calls -- React bails out of re-rendering when
    // setState receives a referentially-equal value, so a fresh array literal per call would
    // otherwise re-render (and thus re-invoke the naive useFocusEffect mock) forever.
    const withRoutine = [{ id: 'r1', name: 'Push Day' }];
    const noRoutines: typeof withRoutine = [];
    let deleted = false;
    (listRoutines as jest.Mock).mockImplementation(() => Promise.resolve(deleted ? noRoutines : withRoutine));
    (deleteRoutine as jest.Mock).mockImplementation(async () => {
      deleted = true;
      return { error: null };
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Delete Routine')?.onPress?.();
    });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('routine-menu-Push Day'));

    expect(deleteRoutine).toHaveBeenCalledWith('r1');
    await waitFor(() => expect(screen.getByText('My Routines (0)')).toBeTruthy());
    alertSpy.mockRestore();
  });

  it('shows the active workout bar when a workout is in progress, and resumes it on press', async () => {
    (router.push as jest.Mock).mockClear();
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (getActiveSession as jest.Mock).mockResolvedValue({ id: 's1', startedAt: '2026-09-04T00:00:00Z' });
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('No exercise')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('active-workout-bar'));

    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s1');
  });

  it('does not show the active workout bar when there is no session in progress', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    (getActiveSession as jest.Mock).mockResolvedValue(null);

    await render(<Workout />);
    await waitFor(() => expect(screen.getByText('Start Empty Workout')).toBeTruthy());

    expect(screen.queryByTestId('active-workout-bar')).toBeNull();
  });

  it('discards the in-progress workout and hides the bar when confirmed from it', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([]);
    const activeSession = { id: 's1', startedAt: '2026-09-04T00:00:00Z' };
    let discarded = false;
    (getActiveSession as jest.Mock).mockImplementation(() => Promise.resolve(discarded ? null : activeSession));
    (getSessionExercises as jest.Mock).mockResolvedValue({ exercises: [], startedAt: '2026-09-04T00:00:00Z' });
    (discardSession as jest.Mock).mockImplementation(async () => {
      discarded = true;
      return { error: null };
    });

    await render(<Workout />);
    await waitFor(() => expect(screen.getByTestId('active-workout-bar')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('active-workout-bar-discard'));
    await fireEvent.press(screen.getByTestId('confirm-modal-confirm'));

    expect(discardSession).toHaveBeenCalledWith('s1');
    await waitFor(() => expect(screen.queryByTestId('active-workout-bar')).toBeNull());
  });
});
