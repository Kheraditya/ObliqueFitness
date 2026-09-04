jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { startSession, getSessionExercises, getLoggedSets } from './api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('startSession', () => {
  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await startSession(null);

    expect(result).toEqual({ id: null, error: 'Not authenticated' });
  });

  it('inserts a workout_sessions row for the current user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const single = jest.fn().mockResolvedValue({ data: { id: 's1' }, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const result = await startSession('r1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions');
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', routine_id: 'r1' });
    expect(result).toEqual({ id: 's1', error: null });
  });
});

describe('getSessionExercises', () => {
  it('derives exercises from the routine when the session has one', async () => {
    const sessionMaybeSingle = jest.fn().mockResolvedValue({
      data: { routine_id: 'r1', started_at: '2026-09-04T00:00:00Z' },
      error: null,
    });
    const sessionEq = jest.fn(() => ({ maybeSingle: sessionMaybeSingle }));
    const sessionSelect = jest.fn(() => ({ eq: sessionEq }));

    const routineOrder = jest.fn().mockResolvedValue({
      data: [
        { exercise_id: 'ex1', order: 0, rest_seconds: 90, superset_group: null, exercises: { name: 'Bench Press' } },
      ],
      error: null,
    });
    const routineEq = jest.fn(() => ({ order: routineOrder }));
    const routineSelect = jest.fn(() => ({ eq: routineEq }));

    const setsEq = jest.fn().mockResolvedValue({ data: [], error: null });
    const setsSelect = jest.fn(() => ({ eq: setsEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: sessionSelect })
      .mockReturnValueOnce({ select: routineSelect })
      .mockReturnValueOnce({ select: setsSelect });

    const result = await getSessionExercises('s1');

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'workout_sessions');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'routine_exercises');
    expect(supabase.from).toHaveBeenNthCalledWith(3, 'workout_sets');
    expect(result).toEqual({
      exercises: [{ exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
  });

  it('adds an ad-hoc exercise that already has a logged set but is not in the routine', async () => {
    const sessionMaybeSingle = jest.fn().mockResolvedValue({
      data: { routine_id: null, started_at: '2026-09-04T00:00:00Z' },
      error: null,
    });
    const sessionEq = jest.fn(() => ({ maybeSingle: sessionMaybeSingle }));
    const sessionSelect = jest.fn(() => ({ eq: sessionEq }));

    const setsEq = jest.fn().mockResolvedValue({
      data: [{ exercise_id: 'ex2', exercises: { name: 'Squat' } }],
      error: null,
    });
    const setsSelect = jest.fn(() => ({ eq: setsEq }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: sessionSelect })
      .mockReturnValueOnce({ select: setsSelect });

    const result = await getSessionExercises('s1');

    expect(result).toEqual({
      exercises: [{ exerciseId: 'ex2', exerciseName: 'Squat', order: 0, restSeconds: 90, supersetGroup: null }],
      startedAt: '2026-09-04T00:00:00Z',
    });
  });
});

describe('getLoggedSets', () => {
  it('returns sets ordered by set number', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'set1', exercise_id: 'ex1', set_number: 1, weight: 100, reps: 5, rpe: null }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedSets('s1');

    expect(supabase.from).toHaveBeenCalledWith('workout_sets');
    expect(eq).toHaveBeenCalledWith('session_id', 's1');
    expect(result).toEqual([{ id: 'set1', exerciseId: 'ex1', setNumber: 1, weight: 100, reps: 5, rpe: null }]);
  });

  it('returns an empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getLoggedSets('s1');

    expect(result).toEqual([]);
  });
});
