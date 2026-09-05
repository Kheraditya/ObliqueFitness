import type { Slug } from 'react-native-body-highlighter';

// Maps this app's free-exercise-db muscle vocabulary onto react-native-body-highlighter's
// slug taxonomy. "abductors" has no equivalent slug in this library (v3.2.0) and is
// deliberately omitted rather than approximated onto an unrelated body part.
export const MUSCLE_TO_SLUG: Partial<Record<string, Slug>> = {
  abdominals: 'abs',
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
