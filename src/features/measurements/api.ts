import { supabase } from '../../lib/supabase';
import type { Measurement } from './types';

interface MeasurementRow {
  id: string;
  type: string;
  value: number;
  unit: string;
  logged_at: string;
}

export async function listMeasurements(type?: string): Promise<Measurement[]> {
  const base = supabase.from('body_measurements').select('id, type, value, unit, logged_at');
  const filtered = type ? base.eq('type', type) : base;
  const { data, error } = await filtered.order('logged_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as MeasurementRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    value: row.value,
    unit: row.unit,
    loggedAt: row.logged_at,
  }));
}

export async function logMeasurement(type: string, value: number, unit: string): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: 'Not authenticated' };

  const { error } = await supabase.from('body_measurements').insert({ user_id: session.user.id, type, value, unit });
  return { error: error ? error.message : null };
}

export async function deleteMeasurement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  return { error: error ? error.message : null };
}
