jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { listRoutines, getRoutine, deleteRoutine } from './api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listRoutines', () => {
  it('returns routines ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'r1', name: 'Push Day' }], error: null });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listRoutines();

    expect(supabase.from).toHaveBeenCalledWith('routines');
    expect(select).toHaveBeenCalledWith('id, name');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual([{ id: 'r1', name: 'Push Day' }]);
  });
});

describe('getRoutine', () => {
  it('returns null when the routine does not exist', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getRoutine('missing');

    expect(result).toBeNull();
  });

  it('returns the routine with its ordered exercises', async () => {
    const routineMaybeSingle = jest.fn().mockResolvedValue({ data: { id: 'r1', name: 'Push Day' }, error: null });
    const routineEq = jest.fn(() => ({ maybeSingle: routineMaybeSingle }));
    const routineSelect = jest.fn(() => ({ eq: routineEq }));

    const exOrder = jest.fn().mockResolvedValue({
      data: [
        { id: 're1', exercise_id: 'ex1', order: 0, target_sets: 3, rest_seconds: 90, superset_group: null, exercises: { name: 'Bench Press' } },
      ],
      error: null,
    });
    const exEq = jest.fn(() => ({ order: exOrder }));
    const exSelect = jest.fn(() => ({ eq: exEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: routineSelect })
      .mockReturnValueOnce({ select: exSelect });

    const result = await getRoutine('r1');

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'routines');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'routine_exercises');
    expect(exEq).toHaveBeenCalledWith('routine_id', 'r1');
    expect(result).toEqual({
      id: 'r1',
      name: 'Push Day',
      exercises: [
        { id: 're1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ],
    });
  });
});

describe('deleteRoutine', () => {
  it('deletes the routine by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const result = await deleteRoutine('r1');

    expect(supabase.from).toHaveBeenCalledWith('routines');
    expect(eq).toHaveBeenCalledWith('id', 'r1');
    expect(result).toEqual({ error: null });
  });
});
