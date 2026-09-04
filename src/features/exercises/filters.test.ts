import { filterExercises } from './filters';
import type { Exercise } from './types';

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    equipment: 'barbell',
    instructions: [],
    images: [],
    is_custom: false,
    ...overrides,
  };
}

describe('filterExercises', () => {
  const exercises: Exercise[] = [
    makeExercise({ id: '1', name: 'Bench Press', equipment: 'barbell', primary_muscles: ['chest'], secondary_muscles: ['triceps'] }),
    makeExercise({ id: '2', name: 'Squat', equipment: 'barbell', primary_muscles: ['quadriceps'], secondary_muscles: [] }),
    makeExercise({ id: '3', name: 'Push Up', equipment: 'body only', primary_muscles: ['chest'], secondary_muscles: [] }),
  ];

  it('returns everything when filters are empty', () => {
    const result = filterExercises(exercises, { search: '', equipment: null, muscle: null });
    expect(result.map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  it('filters by case-insensitive name search', () => {
    const result = filterExercises(exercises, { search: 'bench', equipment: null, muscle: null });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('filters by equipment', () => {
    const result = filterExercises(exercises, { search: '', equipment: 'body only', muscle: null });
    expect(result.map((e) => e.id)).toEqual(['3']);
  });

  it('filters by primary or secondary muscle', () => {
    const result = filterExercises(exercises, { search: '', equipment: null, muscle: 'triceps' });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });

  it('combines all three filters', () => {
    const result = filterExercises(exercises, { search: 'press', equipment: 'barbell', muscle: 'chest' });
    expect(result.map((e) => e.id)).toEqual(['1']);
  });
});
