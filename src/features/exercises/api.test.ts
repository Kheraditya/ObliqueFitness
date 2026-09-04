jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import {
  listExercises,
  getExercise,
  getPersonalRecords,
  getExerciseHistory,
  getLeaderboard,
  setLeaderboardOptIn,
} from './api';

describe('listExercises', () => {
  it('returns exercises ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Squat' }], error: null });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listExercises();

    expect(supabase.from).toHaveBeenCalledWith('exercises');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual([{ id: '1', name: 'Squat' }]);
  });
});

describe('getExercise', () => {
  it('returns a single exercise by id', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: '1', name: 'Squat' }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExercise('1');

    expect(eq).toHaveBeenCalledWith('id', '1');
    expect(result).toEqual({ id: '1', name: 'Squat' });
  });

  it('returns null when not found', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExercise('missing');

    expect(result).toBeNull();
  });
});

describe('getPersonalRecords', () => {
  it('returns all-null records when there are no sets', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPersonalRecords('ex-1');

    expect(result).toEqual({ heaviestWeight: null, best1RM: null, bestSetVolume: null, bestSessionVolume: null });
  });

  it('computes heaviest weight, best 1RM (Epley), best set volume, and best session volume', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [
        { weight: 100, reps: 5, session_id: 's1' },
        { weight: 80, reps: 10, session_id: 's1' },
        { weight: 110, reps: 3, session_id: 's2' },
      ],
      error: null,
    });
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPersonalRecords('ex-1');

    expect(result.heaviestWeight).toBe(110);
    // Epley 1RM for 110kg x 3 reps = 110 * (1 + 3/30) = 121
    expect(result.best1RM).toBeCloseTo(121);
    // Best single-set volume: 100*5=500, 80*10=800, 110*3=330 -> 800
    expect(result.bestSetVolume).toBe(800);
    // Session s1 volume: 500+800=1300; session s2 volume: 330 -> best is 1300
    expect(result.bestSessionVolume).toBe(1300);
  });
});

describe('getExerciseHistory', () => {
  it('groups sets by session with each session\'s date', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { weight: 100, reps: 5, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 105, reps: 3, session_id: 's1', workout_sessions: { started_at: '2026-09-01T00:00:00Z' } },
        { weight: 90, reps: 8, session_id: 's2', workout_sessions: { started_at: '2026-08-25T00:00:00Z' } },
      ],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExerciseHistory('ex-1');

    expect(result).toEqual([
      { sessionId: 's1', date: '2026-09-01T00:00:00Z', sets: [{ weight: 100, reps: 5 }, { weight: 105, reps: 3 }] },
      { sessionId: 's2', date: '2026-08-25T00:00:00Z', sets: [{ weight: 90, reps: 8 }] },
    ]);
  });

  it('returns an empty array when there is no history', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getExerciseHistory('ex-1');

    expect(result).toEqual([]);
  });
});

describe('getLeaderboard', () => {
  it('maps RPC rows to LeaderboardEntry', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ user_id: 'u1', name: 'Alex', heaviest_weight: 120 }],
      error: null,
    });

    const result = await getLeaderboard('ex-1');

    expect(supabase.rpc).toHaveBeenCalledWith('get_exercise_leaderboard', { p_exercise_id: 'ex-1' });
    expect(result).toEqual([{ userId: 'u1', name: 'Alex', heaviestWeight: 120 }]);
  });

  it('returns an empty array on error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await getLeaderboard('ex-1');

    expect(result).toEqual([]);
  });
});

describe('setLeaderboardOptIn', () => {
  it('updates the current user\'s opt-in flag', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });

    const result = await setLeaderboardOptIn(true);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(update).toHaveBeenCalledWith({ leaderboard_opt_in: true });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
    expect(result).toEqual({ error: null });
  });

  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await setLeaderboardOptIn(true);

    expect(result).toEqual({ error: 'Not authenticated' });
  });
});
