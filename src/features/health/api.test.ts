jest.mock('react-native-health-connect', () => ({
  SdkAvailabilityStatus: { SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2, SDK_AVAILABLE: 3 },
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  getGrantedPermissions: jest.fn(),
  requestPermission: jest.fn(),
  aggregateRecord: jest.fn(),
  openHealthConnectSettings: jest.fn(),
}));

import * as healthConnect from 'react-native-health-connect';
import { Platform } from 'react-native';
import { connectHealthApps, getDailyHealthSummary } from './api';

const permissions = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
];

describe('health api', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (healthConnect.getSdkStatus as jest.Mock).mockResolvedValue(3);
    (healthConnect.initialize as jest.Mock).mockResolvedValue(true);
    (healthConnect.getGrantedPermissions as jest.Mock).mockResolvedValue(permissions);
    (healthConnect.aggregateRecord as jest.Mock).mockImplementation(({ recordType }) => {
      const values = {
        Steps: { COUNT_TOTAL: 8123, dataOrigins: ['steps.app'] },
        Distance: { DISTANCE: { inKilometers: 5.7 }, dataOrigins: ['steps.app'] },
        ActiveCaloriesBurned: { ACTIVE_CALORIES_TOTAL: { inKilocalories: 456.4 }, dataOrigins: ['watch.app'] },
        HeartRate: { BPM_AVG: 71.8, MEASUREMENTS_COUNT: 20, dataOrigins: ['watch.app'] },
        SleepSession: { SLEEP_DURATION_TOTAL: 27000, dataOrigins: ['sleep.app'] },
      };
      return Promise.resolve(values[recordType as keyof typeof values]);
    });
  });

  it('aggregates every granted metric for the home screen', async () => {
    await expect(getDailyHealthSummary()).resolves.toMatchObject({
      status: 'connected', steps: 8123, distanceKm: 5.7, activeCalories: 456,
      averageHeartRate: 72, sleepMinutes: 450,
      sources: ['steps.app', 'watch.app', 'sleep.app'],
    });
  });

  it('requests read-only permissions before refreshing health data', async () => {
    (healthConnect.requestPermission as jest.Mock).mockResolvedValue(permissions);
    await connectHealthApps();

    expect(healthConnect.requestPermission).toHaveBeenCalledWith(permissions);
    expect(permissions.every((permission) => permission.accessType === 'read')).toBe(true);
  });
});
