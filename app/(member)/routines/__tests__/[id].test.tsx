import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  getRoutine: jest.fn(),
  getRoutineVolumeHistory: jest.fn().mockResolvedValue([]),
  getLatestRoutinePerformance: jest.fn().mockResolvedValue(null),
  deleteRoutine: jest.fn(),
}));

jest.mock('../../../../src/features/workout/api', () => ({
  startSession: jest.fn(),
}));

jest.mock('../../../../src/features/sharing/api', () => ({
  listShareRecipients: jest.fn().mockResolvedValue([]),
  shareRoutine: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import { getLatestRoutinePerformance, getRoutine } from '../../../../src/features/routines/api';
import { startSession } from '../../../../src/features/workout/api';
import { router, useLocalSearchParams } from 'expo-router';
import RoutineDetail from '../[id]';

describe('RoutineDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'r1' });
    (getLatestRoutinePerformance as jest.Mock).mockResolvedValue(null);
  });

  it('renders the routine name and its exercises', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });

    await render(<RoutineDetail />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('shows the latest performed weight and reps for each exercise', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 1, restSeconds: 90, supersetGroup: null },
      ],
    });
    (getLatestRoutinePerformance as jest.Mock).mockResolvedValue({
      date: '2026-09-05T12:00:00Z',
      durationSeconds: 1800,
      sets: [{ exerciseId: 'ex1', setNumber: 1, weight: 50, reps: 12 }],
    });

    await render(<RoutineDetail />);

    await waitFor(() => expect(screen.getByText('Last performed Sep 5')).toBeTruthy());
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('returns explicitly to the Workout tab when Back is pressed', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [],
    });

    await render(<RoutineDetail />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('routine-back'));

    expect(router.replace).toHaveBeenCalledWith('/(member)/workout');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('starts a session for this routine and navigates to it when "Start Routine" is pressed', async () => {
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [],
    });
    (startSession as jest.Mock).mockResolvedValue({ id: 's1', error: null });

    await render(<RoutineDetail />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByText('Start Routine'));

    expect(startSession).toHaveBeenCalledWith('r1');
    expect(router.push).toHaveBeenCalledWith('/(member)/active-workout/s1');
  });

  it('shows an error and does not navigate when starting a session fails', async () => {
    (router.push as jest.Mock).mockClear();
    (getRoutine as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Push Day',
      exercises: [],
    });
    (startSession as jest.Mock).mockResolvedValue({ id: null, error: 'Not authenticated' });

    await render(<RoutineDetail />);
    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());

    await fireEvent.press(screen.getByText('Start Routine'));

    await waitFor(() => expect(screen.getByText('Not authenticated')).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('supports a read-only admin view and returns to the selected member', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'r1',
      readOnly: 'true',
      returnTo: '/(admin)/members/u1',
    });
    (getRoutine as jest.Mock).mockResolvedValue({ id: 'r1', name: 'Push Day', exercises: [] });

    await render(<RoutineDetail />);
    await waitFor(() => expect(screen.getByText('Member routine · 0 exercises')).toBeTruthy());
    expect(screen.queryByText('Start Routine')).toBeNull();
    expect(screen.queryByText('Edit Routine')).toBeNull();
    expect(screen.queryByLabelText('Share routine')).toBeNull();

    fireEvent.press(screen.getByTestId('routine-back'));
    expect(router.replace).toHaveBeenCalledWith('/(admin)/members/u1');
  });
});
