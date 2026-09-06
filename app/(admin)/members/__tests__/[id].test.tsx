import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../../../../src/features/admin/api', () => ({
  getAdminMember: jest.fn(),
  getMemberProgress: jest.fn(),
  listMemberRoutines: jest.fn(),
  saveMemberMembership: jest.fn(),
  createAssignedRoutine: jest.fn(),
  setMemberAppAccess: jest.fn(),
}));
jest.mock('../../../../src/features/exercises/api', () => ({ listExercises: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'u1' }),
}));

import { createAssignedRoutine, getAdminMember, getMemberProgress, listMemberRoutines, saveMemberMembership, setMemberAppAccess } from '../../../../src/features/admin/api';
import { listExercises } from '../../../../src/features/exercises/api';
import { router } from 'expo-router';
import AdminMemberDetail from '../[id]';

const member = {
  id: 'u1',
  name: 'Alex',
  email: 'alex@example.com',
  avatarUrl: null,
  accessEnabled: true,
  membership: { id: 'm1', planName: 'Monthly', startDate: '2026-09-01', endDate: null, status: 'active' as const },
};

describe('AdminMemberDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminMember as jest.Mock).mockResolvedValue(member);
    (getMemberProgress as jest.Mock).mockResolvedValue({ workoutCount: 4, totalVolume: 12000, totalDurationSeconds: 3600, lastWorkoutAt: '2026-09-05T00:00:00Z', latestWeight: { value: 75, unit: 'kg', loggedAt: '2026-09-05' } });
    (listMemberRoutines as jest.Mock).mockResolvedValue([]);
    (listExercises as jest.Mock).mockResolvedValue([{ id: 'ex1', name: 'Bench Press' }]);
    (setMemberAppAccess as jest.Mock).mockResolvedValue({ error: null });
  });

  it('shows progress and lets the admin update membership', async () => {
    (saveMemberMembership as jest.Mock).mockResolvedValue({ id: 'm1', error: null });
    await render(<AdminMemberDetail />);

    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
    expect(screen.getByText('12,000 kg')).toBeTruthy();
    expect(screen.getByText('75 kg')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Plan name'), 'Annual');
    await fireEvent.press(screen.getByText('Save Membership'));

    expect(saveMemberMembership).toHaveBeenCalledWith(
      'u1',
      { planName: 'Annual', startDate: '2026-09-01', endDate: null, status: 'active' },
      'm1'
    );
  });

  it('assigns a named routine with selected exercises', async () => {
    (createAssignedRoutine as jest.Mock).mockResolvedValue({ id: 'r1', error: null });
    await render(<AdminMemberDetail />);
    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('Routine name'), 'Push Day');
    await fireEvent.press(screen.getByText('Choose exercises'));
    await fireEvent.press(screen.getByText('Bench Press'));
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByText('Assign Routine'));

    expect(createAssignedRoutine).toHaveBeenCalledWith('u1', 'Push Day', ['ex1']);
    await waitFor(() => expect(screen.getByText('Routine assigned to member')).toBeTruthy());
  });

  it('opens a member routine in read-only detail mode and preserves the member return route', async () => {
    (listMemberRoutines as jest.Mock).mockResolvedValue([{ id: 'r1', name: 'Push Day', exerciseCount: 2 }]);
    await render(<AdminMemberDetail />);
    await waitFor(() => expect(screen.getByLabelText('View Push Day')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('View Push Day'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/routines/r1',
      params: { returnTo: '/(admin)/members/u1', readOnly: 'true' },
    });
  });

  it('lets the admin pause member app access without removing their data', async () => {
    await render(<AdminMemberDetail />);
    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());

    await fireEvent(screen.getByTestId('member-access-switch'), 'valueChange', false);
    expect(setMemberAppAccess).toHaveBeenCalledWith('u1', false);
    await waitFor(() => expect(screen.getByText('App access paused')).toBeTruthy());
  });
});
