import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../src/features/admin/api', () => ({
  getMyProgress: jest.fn(),
  listMyRoutines: jest.fn(),
}));
jest.mock('../../../src/features/exercises/api', () => ({ listExercises: jest.fn() }));
jest.mock('../../../src/features/routines/api', () => ({ createRoutine: jest.fn() }));
jest.mock('../../../src/features/workout/api', () => ({ startSession: jest.fn() }));
jest.mock('../../../src/features/sharing/api', () => ({
  listShareRecipients: jest.fn().mockResolvedValue([]),
  shareRoutine: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

import { getMyProgress, listMyRoutines } from '../../../src/features/admin/api';
import { listExercises } from '../../../src/features/exercises/api';
import { startSession } from '../../../src/features/workout/api';
import { router } from 'expo-router';
import AdminMyTraining from '../my-training';

describe('AdminMyTraining', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMyProgress as jest.Mock).mockResolvedValue({
      workoutCount: 4,
      totalVolume: 12340,
      totalDurationSeconds: 5400,
      lastWorkoutAt: '2026-09-05T12:00:00Z',
      latestWeight: { value: 78, unit: 'kg', loggedAt: '2026-09-05' },
    });
    (listMyRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Admin Push', exerciseCount: 3 }]);
    (listExercises as jest.Mock).mockResolvedValue([]);
  });

  it('shows the admin own progress and routines', async () => {
    await render(<AdminMyTraining />);

    await waitFor(() => expect(screen.getByText('Admin Push')).toBeTruthy());
    expect(screen.getByText('12,340')).toBeTruthy();
    expect(screen.getByText('78 kg')).toBeTruthy();
  });

  it('starts the admin own routine and returns to My Training', async () => {
    (startSession as jest.Mock).mockResolvedValue({ id: 'session-1', error: null });
    await render(<AdminMyTraining />);
    await waitFor(() => expect(screen.getByLabelText('Start Admin Push')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Start Admin Push'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/active-workout/session-1',
      params: { returnTo: '/(admin)/my-training' },
    }));
  });
});
