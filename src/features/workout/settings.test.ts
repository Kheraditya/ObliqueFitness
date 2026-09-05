jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkoutSettings, updateWorkoutSetting, DEFAULT_WORKOUT_SETTINGS } from './settings';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getWorkoutSettings', () => {
  it('returns the defaults when nothing has been saved yet', async () => {
    const result = await getWorkoutSettings();
    expect(result).toEqual(DEFAULT_WORKOUT_SETTINGS);
  });

  it('returns previously saved settings merged over the defaults', async () => {
    await updateWorkoutSetting('keepAwake', true);

    const result = await getWorkoutSettings();

    expect(result.keepAwake).toBe(true);
    expect(result.plateCalculator).toBe(DEFAULT_WORKOUT_SETTINGS.plateCalculator); // untouched default preserved
  });
});

describe('updateWorkoutSetting', () => {
  it('persists a single setting without disturbing the others', async () => {
    await updateWorkoutSetting('rpeTracking', true);
    const afterFirst = await updateWorkoutSetting('inlineTimer', false);

    expect(afterFirst).toEqual({ ...DEFAULT_WORKOUT_SETTINGS, rpeTracking: true, inlineTimer: false });
  });
});
