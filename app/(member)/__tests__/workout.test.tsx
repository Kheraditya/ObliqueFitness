import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../src/features/routines/api', () => ({
  listRoutines: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('../../../src/features/workout/api', () => ({
  startSession: jest.fn(),
}));

import { listRoutines } from '../../../src/features/routines/api';
import { startSession } from '../../../src/features/workout/api';
import { router } from 'expo-router';
import Workout from '../workout';

describe('Workout', () => {
  it('renders the routines list once loaded', async () => {
    (listRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day' }]);

    await render(<Workout />);

    await waitFor(() => expect(screen.getByText('Push Day')).toBeTruthy());
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
});
