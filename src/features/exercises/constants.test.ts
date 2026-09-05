import { matchesEquipmentOption, EQUIPMENT_OPTIONS } from './constants';

// Every distinct equipment value actually present in the seeded exercise library
// (supabase/migrations/0006_seed_exercise_library.sql), so a real seeded row is never silently
// unfilterable under every equipment option.
const SEEDED_EQUIPMENT_VALUES = [
  'bands',
  'barbell',
  'body only',
  'cable',
  'dumbbell',
  'e-z curl bar',
  'exercise ball',
  'foam roll',
  'kettlebells',
  'machine',
  'medicine ball',
  'other',
];

describe('matchesEquipmentOption', () => {
  it('matches an exact case-insensitive value', () => {
    expect(matchesEquipmentOption('Barbell', 'Barbell')).toBe(true);
    expect(matchesEquipmentOption('barbell', 'Barbell')).toBe(true);
  });

  it('matches legacy seeded values via known aliases', () => {
    expect(matchesEquipmentOption('kettlebells', 'Kettlebell')).toBe(true);
    expect(matchesEquipmentOption('bands', 'Resistance Band')).toBe(true);
    expect(matchesEquipmentOption('body only', 'None')).toBe(true);
    expect(matchesEquipmentOption('medicine ball', 'Other')).toBe(true);
    expect(matchesEquipmentOption('e-z curl bar', 'Barbell')).toBe(true);
    expect(matchesEquipmentOption('cable', 'Cable')).toBe(true);
  });

  it('matches every distinct equipment value in the seeded library against some option', () => {
    for (const value of SEEDED_EQUIPMENT_VALUES) {
      const matchesSomeOption = EQUIPMENT_OPTIONS.some((option) => matchesEquipmentOption(value, option.key));
      expect(matchesSomeOption).toBe(true);
    }
  });

  it('does not match unrelated equipment', () => {
    expect(matchesEquipmentOption('dumbbell', 'Barbell')).toBe(false);
  });

  it('does not match null equipment against a real option', () => {
    expect(matchesEquipmentOption(null, 'Barbell')).toBe(false);
  });

  it('does not treat null equipment as an implicit match for None', () => {
    expect(matchesEquipmentOption(null, 'None')).toBe(false);
  });
});
