import type { Slug } from 'react-native-body-highlighter';

// Maps this app's free-exercise-db muscle vocabulary onto react-native-body-highlighter's
// slug taxonomy. The library has no separate hip-abductor region, so abductors use its nearest
// anatomical region (gluteal) instead of disappearing from the seven-day graph.
export const MUSCLE_TO_SLUG: Partial<Record<string, Slug>> = {
  abdominals: 'abs',
  abductors: 'gluteal',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearm',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  lats: 'upper-back',
  'lower back': 'lower-back',
  'middle back': 'upper-back',
  neck: 'neck',
  quadriceps: 'quadriceps',
  shoulders: 'deltoids',
  traps: 'trapezius',
  triceps: 'triceps',
};
