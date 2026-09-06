import { Linking, Platform } from 'react-native';
import type { Permission } from 'react-native-health-connect';

export type HealthConnectionStatus = 'loading' | 'connected' | 'disconnected' | 'unavailable';

export interface DailyHealthSummary {
  status: HealthConnectionStatus;
  steps: number | null;
  distanceKm: number | null;
  activeCalories: number | null;
  averageHeartRate: number | null;
  sleepMinutes: number | null;
  sources: string[];
  error: string | null;
}

const readPermissions: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
];

const emptySummary: DailyHealthSummary = {
  status: 'disconnected',
  steps: null,
  distanceKm: null,
  activeCalories: null,
  averageHeartRate: null,
  sleepMinutes: null,
  sources: [],
  error: null,
};

function loadHealthConnect(): typeof import('react-native-health-connect') {
  // Kept behind the Android guard so web, iOS, Expo Go, and unit tests never attempt to load the
  // native module unless the integration is actually being used.
  return require('react-native-health-connect') as typeof import('react-native-health-connect');
}

function timeRanges() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const sleepStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    today: { operator: 'between' as const, startTime: today.toISOString(), endTime: now.toISOString() },
    last24Hours: { operator: 'between' as const, startTime: sleepStart.toISOString(), endTime: now.toISOString() },
  };
}

function hasPermission(granted: Permission[], recordType: Permission['recordType']): boolean {
  return granted.some((permission) => permission.accessType === 'read' && permission.recordType === recordType);
}

export async function getDailyHealthSummary(): Promise<DailyHealthSummary> {
  if (Platform.OS !== 'android') return { ...emptySummary, status: 'unavailable' };

  try {
    const health = loadHealthConnect();
    const sdkStatus = await health.getSdkStatus();
    if (sdkStatus !== health.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return {
        ...emptySummary,
        status: 'unavailable',
        error: sdkStatus === health.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
          ? 'Health Connect needs to be installed or updated.'
          : 'Health Connect is not available on this device.',
      };
    }

    const initialized = await health.initialize();
    if (!initialized) return { ...emptySummary, status: 'unavailable', error: 'Health Connect could not start.' };

    const granted = (await health.getGrantedPermissions()).filter(
      (permission): permission is Permission => 'recordType' in permission && permission.recordType !== 'ExerciseRoute'
    );
    if (!readPermissions.some((permission) => hasPermission(granted, permission.recordType))) {
      return emptySummary;
    }

    const ranges = timeRanges();
    const sources = new Set<string>();
    const summary: DailyHealthSummary = { ...emptySummary, status: 'connected' };

    if (hasPermission(granted, 'Steps')) {
      const result = await health.aggregateRecord({ recordType: 'Steps', timeRangeFilter: ranges.today });
      summary.steps = Math.round(result.COUNT_TOTAL ?? 0);
      result.dataOrigins?.forEach((source) => sources.add(source));
    }
    if (hasPermission(granted, 'Distance')) {
      const result = await health.aggregateRecord({ recordType: 'Distance', timeRangeFilter: ranges.today });
      summary.distanceKm = result.DISTANCE?.inKilometers ?? 0;
      result.dataOrigins?.forEach((source) => sources.add(source));
    }
    if (hasPermission(granted, 'ActiveCaloriesBurned')) {
      const result = await health.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: ranges.today });
      summary.activeCalories = Math.round(result.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0);
      result.dataOrigins?.forEach((source) => sources.add(source));
    }
    if (hasPermission(granted, 'HeartRate')) {
      const result = await health.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: ranges.today });
      summary.averageHeartRate = result.MEASUREMENTS_COUNT ? Math.round(result.BPM_AVG) : null;
      result.dataOrigins?.forEach((source) => sources.add(source));
    }
    if (hasPermission(granted, 'SleepSession')) {
      const result = await health.aggregateRecord({ recordType: 'SleepSession', timeRangeFilter: ranges.last24Hours });
      summary.sleepMinutes = Math.round((result.SLEEP_DURATION_TOTAL ?? 0) / 60);
      result.dataOrigins?.forEach((source) => sources.add(source));
    }

    summary.sources = Array.from(sources);
    return summary;
  } catch (error) {
    return {
      ...emptySummary,
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Health Connect could not be opened.',
    };
  }
}

export async function connectHealthApps(): Promise<DailyHealthSummary> {
  if (Platform.OS !== 'android') return { ...emptySummary, status: 'unavailable' };
  try {
    const health = loadHealthConnect();
    const sdkStatus = await health.getSdkStatus();
    if (sdkStatus !== health.SdkAvailabilityStatus.SDK_AVAILABLE || !(await health.initialize())) {
      return { ...emptySummary, status: 'unavailable', error: 'Health Connect is not available or needs an update.' };
    }
    await health.requestPermission(readPermissions);
    return getDailyHealthSummary();
  } catch (error) {
    return {
      ...emptySummary,
      error: error instanceof Error ? error.message : 'Health permissions were not granted.',
    };
  }
}

export async function openHealthAppsSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const health = loadHealthConnect();
  health.openHealthConnectSettings();
}

export async function openHealthConnectStore(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.openURL('market://details?id=com.google.android.apps.healthdata');
  } catch {
    await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
  }
}
