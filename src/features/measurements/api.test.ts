jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { listMeasurements, logMeasurement, deleteMeasurement } from './api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listMeasurements', () => {
  it('lists all measurements ordered by date when no type is given', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'm1', type: 'weight', value: 80, unit: 'kg', logged_at: '2026-09-01T00:00:00Z' }],
      error: null,
    });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements();

    expect(supabase.from).toHaveBeenCalledWith('body_measurements');
    expect(result).toEqual([{ id: 'm1', type: 'weight', value: 80, unit: 'kg', loggedAt: '2026-09-01T00:00:00Z' }]);
  });

  it('filters by type when given', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'm2', type: 'body_fat', value: 18, unit: '%', logged_at: '2026-09-02T00:00:00Z' }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements('body_fat');

    expect(eq).toHaveBeenCalledWith('type', 'body_fat');
    expect(result).toEqual([{ id: 'm2', type: 'body_fat', value: 18, unit: '%', loggedAt: '2026-09-02T00:00:00Z' }]);
  });

  it('returns an empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const select = jest.fn(() => ({ order }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMeasurements();

    expect(result).toEqual([]);
  });
});

describe('logMeasurement', () => {
  it('returns an error when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const result = await logMeasurement('weight', 80, 'kg');

    expect(result).toEqual({ error: 'Not authenticated' });
  });

  it('inserts a body_measurements row for the current user', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    const insert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    const result = await logMeasurement('weight', 80, 'kg');

    expect(supabase.from).toHaveBeenCalledWith('body_measurements');
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', type: 'weight', value: 80, unit: 'kg' });
    expect(result).toEqual({ error: null });
  });
});

describe('deleteMeasurement', () => {
  it('deletes a measurement by id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const del = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: del });

    const result = await deleteMeasurement('m1');

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ error: null });
  });
});
