jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { getPeriodSummary, getSetsCountByMuscle, getMonthlyTotals, getMainExercises } from './reports';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getPeriodSummary', () => {
  it('sums workouts/duration/volume/sets for finished sessions only', async () => {
    const lt = jest.fn().mockResolvedValue({
      data: [
        {
          ended_at: '2026-09-01T01:00:00Z',
          duration_seconds: 1800,
          workout_sets: [{ weight: 100, reps: 5 }, { weight: 50, reps: 10 }],
        },
        {
          ended_at: null, // abandoned session, must be excluded
          duration_seconds: null,
          workout_sets: [{ weight: 999, reps: 999 }],
        },
      ],
      error: null,
    });
    const gte = jest.fn(() => ({ lt }));
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPeriodSummary('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');

    expect(gte).toHaveBeenCalledWith('started_at', '2026-09-01T00:00:00Z');
    expect(lt).toHaveBeenCalledWith('started_at', '2026-10-01T00:00:00Z');
    expect(result).toEqual({ workouts: 1, durationSeconds: 1800, volume: 1000, sets: 2 });
  });

  it('returns zeros when there is no data', async () => {
    const lt = jest.fn().mockResolvedValue({ data: null, error: null });
    const gte = jest.fn(() => ({ lt }));
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getPeriodSummary('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');

    expect(result).toEqual({ workouts: 0, durationSeconds: 0, volume: 0, sets: 0 });
  });
});

describe('getSetsCountByMuscle', () => {
  it('counts sets for both primary and secondary muscles', async () => {
    const not = jest.fn().mockResolvedValue({
      data: [
        {
          workout_sets: [
            { exercises: { primary_muscles: ['chest'], secondary_muscles: ['triceps'] } },
            { exercises: { primary_muscles: ['chest'], secondary_muscles: [] } },
          ],
        },
      ],
      error: null,
    });
    const lt = jest.fn(() => ({ not }));
    const gte = jest.fn(() => ({ lt }));
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getSetsCountByMuscle('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');

    expect(not).toHaveBeenCalledWith('ended_at', 'is', null);
    expect(result).toEqual(
      expect.arrayContaining([
        { muscle: 'chest', sets: 2 },
        { muscle: 'triceps', sets: 1 },
      ])
    );
  });
});

describe('getMainExercises', () => {
  it('ranks completed-set exercises by frequency', async () => {
    const not = jest.fn().mockResolvedValue({
      data: [{ workout_sets: [
        { exercise_id: 'e1', exercises: { name: 'Bench Press', images: ['bench.jpg'] } },
        { exercise_id: 'e1', exercises: { name: 'Bench Press', images: ['bench.jpg'] } },
        { exercise_id: 'e2', exercises: { name: 'Squat', images: [] } },
      ] }],
      error: null,
    });
    const gte = jest.fn(() => ({ not }));
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn(() => ({ gte })) });

    await expect(getMainExercises('2026-06-01T00:00:00Z')).resolves.toEqual([
      { id: 'e1', name: 'Bench Press', imageUri: 'bench.jpg', setCount: 2 },
      { id: 'e2', name: 'Squat', setCount: 1 },
    ]);
  });
});

describe('getMonthlyTotals', () => {
  it('buckets sessions into their calendar month, filling empty months with zeros', async () => {
    const not = jest.fn().mockResolvedValue({
      data: [
        { started_at: '2026-09-02T00:00:00Z', ended_at: '2026-09-02T01:00:00Z', duration_seconds: 1800, workout_sets: [{ weight: 100, reps: 5 }] },
        { started_at: '2026-07-15T00:00:00Z', ended_at: '2026-07-15T01:00:00Z', duration_seconds: 900, workout_sets: [{ weight: 50, reps: 10 }] },
      ],
      error: null,
    });
    const gte = jest.fn(() => ({ not }));
    const select = jest.fn(() => ({ gte }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await getMonthlyTotals(3); // July, August, September 2026

    expect(result).toEqual([
      { month: '2026-07', workouts: 1, durationSeconds: 900, volume: 500 },
      { month: '2026-08', workouts: 0, durationSeconds: 0, volume: 0 },
      { month: '2026-09', workouts: 1, durationSeconds: 1800, volume: 500 },
    ]);
  });
});
