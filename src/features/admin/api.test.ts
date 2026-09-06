jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn(), rpc: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
import { createAssignedRoutine, getGymWelcomeCode, listGymMembers, rotateGymWelcomeCode, saveMemberMembership, setMemberAppAccess } from './api';

describe('admin api', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists members with their latest membership', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{
        id: 'u1', email: 'alex@example.com', name: 'Alex', avatar_url: null, app_access_enabled: true,
        memberships: [
          { id: 'old', plan_name: 'Trial', start_date: '2026-01-01', end_date: null, status: 'expired', created_at: '2026-01-01' },
          { id: 'new', plan_name: 'Annual', start_date: '2026-09-01', end_date: null, status: 'active', created_at: '2026-09-01' },
        ],
      }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const members = await listGymMembers();

    expect(eq).toHaveBeenCalledWith('role', 'member');
    expect(members[0]).toEqual({
      id: 'u1', name: 'Alex', email: 'alex@example.com', avatarUrl: null, accessEnabled: true,
      membership: { id: 'new', planName: 'Annual', startDate: '2026-09-01', endDate: null, status: 'active' },
    });
  });

  it('loads and rotates the admin welcome code through protected RPCs', async () => {
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({ data: 'OLD12345', error: null })
      .mockResolvedValueOnce({ data: 'NEW12345', error: null });
    await expect(getGymWelcomeCode()).resolves.toEqual({ code: 'OLD12345', error: null });
    await expect(rotateGymWelcomeCode()).resolves.toEqual({ code: 'NEW12345', error: null });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_current_gym_welcome_code');
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'rotate_gym_welcome_code');
  });

  it('changes member access through the admin-only RPC', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
    await expect(setMemberAppAccess('u1', false)).resolves.toEqual({ error: null });
    expect(supabase.rpc).toHaveBeenCalledWith('set_member_app_access', { p_member_id: 'u1', p_enabled: false });
  });

  it('updates an existing membership', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const result = await saveMemberMembership(
      'u1',
      { planName: 'Annual', startDate: '2026-09-01', endDate: null, status: 'active' },
      'm1'
    );

    expect(update).toHaveBeenCalledWith({ user_id: 'u1', plan_name: 'Annual', start_date: '2026-09-01', end_date: null, status: 'active' });
    expect(eq).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ id: 'm1', error: null });
  });

  it('creates a routine owned by the selected member and tagged with the admin', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'admin1' } } } });
    const single = jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    const select = jest.fn(() => ({ single }));
    const routineInsert = jest.fn(() => ({ select }));
    const exerciseInsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ insert: routineInsert })
      .mockReturnValueOnce({ insert: exerciseInsert });

    const result = await createAssignedRoutine('u1', ' Push Day ', ['ex1']);

    expect(routineInsert).toHaveBeenCalledWith({ owner_id: 'u1', assigned_by_admin_id: 'admin1', name: 'Push Day' });
    expect(exerciseInsert).toHaveBeenCalledWith([{
      routine_id: 'r1', exercise_id: 'ex1', order: 0, target_sets: 3,
      rest_seconds: 90, notes: null, superset_group: null,
    }]);
    expect(result).toEqual({ id: 'r1', error: null });
  });
});
