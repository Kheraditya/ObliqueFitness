import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/routines/api', () => ({
  getRoutine: jest.fn(),
  getRoutineVolumeHistory: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../../src/features/workout/api', () => ({
  startSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r1' }),
  router: { push: jest.fn() },
}));

import { getRoutine } from '../../../../src/features/routines/api';
import { startSession } from '../../../../src/features/workout/api';
import { router } from 'expo-router';
import RoutineDetail from '../[id]';

describe('RoutineDetail', () => {
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
});
