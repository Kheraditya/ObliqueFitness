import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

jest.mock('../../../src/features/admin/api', () => ({ listGymMembers: jest.fn(), getGymWelcomeCode: jest.fn(), rotateGymWelcomeCode: jest.fn() }));
jest.mock('../../../src/features/auth/api', () => ({ signOut: jest.fn() }));
jest.mock('../../../src/features/workout/api', () => ({ startSession: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

import { getGymWelcomeCode, listGymMembers, rotateGymWelcomeCode } from '../../../src/features/admin/api';
import { startSession } from '../../../src/features/workout/api';
import { router } from 'expo-router';
import AdminDashboard from '../dashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGymWelcomeCode as jest.Mock).mockResolvedValue({ code: 'GYM12345', error: null });
  });

  it('lists gym members and opens their management page', async () => {
    (listGymMembers as jest.Mock).mockResolvedValue([
      { id: 'u1', name: 'Alex', email: 'alex@example.com', avatarUrl: null, accessEnabled: true, membership: { id: 'm1', planName: 'Monthly', startDate: '2026-09-01', endDate: null, status: 'active' } },
    ]);

    await render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
    expect(screen.getByText('Monthly')).toBeTruthy();

    await fireEvent.press(screen.getByText('Alex'));
    expect(router.push).toHaveBeenCalledWith('/(admin)/members/u1');
  });

  it('starts a self workout with an admin return destination', async () => {
    (listGymMembers as jest.Mock).mockResolvedValue([]);
    (startSession as jest.Mock).mockResolvedValue({ id: 's1', error: null });

    await render(<AdminDashboard />);
    await fireEvent.press(screen.getByText('Log My Workout'));

    expect(startSession).toHaveBeenCalledWith(null);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/active-workout/s1',
      params: { returnTo: '/(admin)/dashboard' },
    });
  });

  it('opens the admin personal progress and routines area', async () => {
    (listGymMembers as jest.Mock).mockResolvedValue([]);
    await render(<AdminDashboard />);

    await fireEvent.press(screen.getByText('My Progress & Routines'));
    expect(router.push).toHaveBeenCalledWith('/(admin)/my-training');
  });

  it('shows, shares and rotates the gym welcome code', async () => {
    (listGymMembers as jest.Mock).mockResolvedValue([]);
    (rotateGymWelcomeCode as jest.Mock).mockResolvedValue({ code: 'NEW67890', error: null });
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('GYM12345')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Share welcome code'));
    expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('GYM12345') }));
    await fireEvent.press(screen.getByLabelText('Rotate welcome code'));
    await fireEvent.press(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(screen.getByText('NEW67890')).toBeTruthy());
    shareSpy.mockRestore();
  });
});
