jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: jest.fn(), auth: { getSession: jest.fn() }, from: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
import { listShareRecipients, shareRoutine } from './api';

describe('routine sharing api', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads only recipients returned by the same-gym database function', async () => {
    const recipients = [{ id: 'u2', name: 'Sam', email: 'sam@example.com' }];
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: recipients, error: null });

    await expect(listShareRecipients()).resolves.toEqual(recipients);
    expect(supabase.rpc).toHaveBeenCalledWith('list_gym_share_recipients');
  });

  it('copies a routine through the guarded database function', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'copied-routine', error: null });

    await expect(shareRoutine('routine-1', 'user-2')).resolves.toEqual({
      routineId: 'copied-routine',
      error: null,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('share_routine_with_gym_member', {
      p_routine_id: 'routine-1',
      p_recipient_id: 'user-2',
    });
  });

  it('falls back to the admin same-gym users query when the recipient RPC is unavailable', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Function not found' } });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } });

    const profileMaybeSingle = jest.fn().mockResolvedValue({ data: { gym_id: 'gym-1', role: 'admin' } });
    const profileEq = jest.fn(() => ({ maybeSingle: profileMaybeSingle }));
    const recipientOrder = jest.fn().mockResolvedValue({
      data: [{ id: 'user-2', name: 'Sam', email: 'sam@example.com' }],
      error: null,
    });
    const recipientNeq = jest.fn(() => ({ order: recipientOrder }));
    const recipientEq = jest.fn(() => ({ neq: recipientNeq }));
    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: profileEq })) })
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: recipientEq })) });

    await expect(listShareRecipients()).resolves.toEqual([
      { id: 'user-2', name: 'Sam', email: 'sam@example.com' },
    ]);
    expect(recipientEq).toHaveBeenCalledWith('gym_id', 'gym-1');
    expect(recipientNeq).toHaveBeenCalledWith('id', 'admin-1');
  });

  it('uses the admin same-gym RLS fallback to copy a routine when the share RPC is unavailable', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Function not found' } });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } });

    const senderEq = jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { gym_id: 'gym-1', role: 'admin' } }) }));
    const recipientGymEq = jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-2' } }) }));
    const recipientIdEq = jest.fn(() => ({ eq: recipientGymEq }));
    const sourceOwnerEq = jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { name: 'Push Day', notes: null } }) }));
    const sourceIdEq = jest.fn(() => ({ eq: sourceOwnerEq }));
    const routineInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: { id: 'copy-1' }, error: null }) })) }));
    const sourceExercisesEq = jest.fn().mockResolvedValue({
      data: [{ exercise_id: 'ex-1', order: 0, target_sets: 3, rest_seconds: 90, notes: null, superset_group: null }],
      error: null,
    });
    const exerciseInsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: senderEq })) })
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: recipientIdEq })) })
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: sourceIdEq })) })
      .mockReturnValueOnce({ insert: routineInsert })
      .mockReturnValueOnce({ select: jest.fn(() => ({ eq: sourceExercisesEq })) })
      .mockReturnValueOnce({ insert: exerciseInsert });

    await expect(shareRoutine('routine-1', 'user-2')).resolves.toEqual({ error: null, routineId: 'copy-1' });
    expect(routineInsert).toHaveBeenCalledWith({
      owner_id: 'user-2',
      assigned_by_admin_id: 'admin-1',
      name: 'Push Day',
      notes: null,
    });
    expect(exerciseInsert).toHaveBeenCalledWith([
      { routine_id: 'copy-1', exercise_id: 'ex-1', order: 0, target_sets: 3, rest_seconds: 90, notes: null, superset_group: null },
    ]);
  });
});
