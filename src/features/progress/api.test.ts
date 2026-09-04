jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { getMuscleVolumes, getHomeSummary } from './api';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getMuscleVolumes', () => {
  it('sums weight*reps per primary muscle across the last 7 days', async () => {
    const gte = jest.fn().mockResolvedValue({
      data: [
        {
          started_at: '2026-09-03T00:00:00Z',
          workout_sets: [
            { weight: 100, reps: 5, exercises: { primary_muscles: ['chest', 'triceps'] } },
            { weight: 50, reps: 10, exercises: { primary_muscles: ['triceps'] } },
          ],
        },
      ],
      error: null,
    });
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getMuscleVolumes();

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions');
    expect(result).toEqual(
      expect.arrayContaining([
        { muscle: 'chest', volume: 500 },
        { muscle: 'triceps', volume: 1000 },
      ])
    );
  });

  it('returns an empty array on error', async () => {
    const gte = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getMuscleVolumes();

    expect(result).toEqual([]);
  });
});

describe('getHomeSummary', () => {
  it('computes workout count, volume change, streak, and muscle volumes', async () => {
    const volumeGte = jest.fn().mockResolvedValue({
      data: [
        {
          started_at: '2026-09-03T00:00:00Z',
          workout_sets: [{ weight: 100, reps: 5, exercises: { primary_muscles: ['chest'] } }],
        },
        {
          started_at: '2026-08-25T00:00:00Z',
          workout_sets: [{ weight: 100, reps: 4, exercises: { primary_muscles: ['chest'] } }],
        },
      ],
      error: null,
    });
    const volumeSelect = jest.fn(() => ({ gte: volumeGte }));

    const streakOrder = jest.fn().mockResolvedValue({
      data: [
        { started_at: '2026-09-04T00:00:00Z', ended_at: '2026-09-04T01:00:00Z' },
        { started_at: '2026-09-03T00:00:00Z', ended_at: '2026-09-03T01:00:00Z' },
      ],
      error: null,
    });
    const streakGte = jest.fn(() => ({ order: streakOrder }));
    const streakSelect = jest.fn(() => ({ gte: streakGte }));

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({ select: volumeSelect })
      .mockReturnValueOnce({ select: streakSelect });

    const result = await getHomeSummary();

    expect(result.workoutCountThisWeek).toBe(1);
    expect(result.volumeChangePct).toBe(25);
    expect(result.streakDays).toBe(2);
    expect(result.muscleVolumes).toEqual([{ muscle: 'chest', volume: 500 }]);
  });
});
