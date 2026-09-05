import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutSettings {
  keepAwake: boolean;
  plateCalculator: boolean;
  rpeTracking: boolean;
  smartSupersetScrolling: boolean;
  inlineTimer: boolean;
  livePrNotification: boolean;
}

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  keepAwake: false,
  plateCalculator: true,
  rpeTracking: false,
  smartSupersetScrolling: false,
  inlineTimer: true,
  livePrNotification: true,
};

const STORAGE_KEY = 'oblique.workoutSettings';

export async function getWorkoutSettings(): Promise<WorkoutSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKOUT_SETTINGS;
    return { ...DEFAULT_WORKOUT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WORKOUT_SETTINGS;
  }
}

export async function updateWorkoutSetting<K extends keyof WorkoutSettings>(
  key: K,
  value: WorkoutSettings[K]
): Promise<WorkoutSettings> {
  const current = await getWorkoutSettings();
  const updated = { ...current, [key]: value };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
