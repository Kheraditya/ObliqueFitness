import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../src/features/workout/settings', () => ({
  getWorkoutSettings: jest.fn(),
  updateWorkoutSetting: jest.fn(),
  DEFAULT_WORKOUT_SETTINGS: {
    keepAwake: false,
    plateCalculator: true,
    rpeTracking: false,
    smartSupersetScrolling: false,
    inlineTimer: true,
    livePrNotification: true,
  },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

import { getWorkoutSettings, updateWorkoutSetting } from '../../../../src/features/workout/settings';
import { router } from 'expo-router';
import WorkoutSettingsScreen from '../settings';

const DEFAULTS = {
  keepAwake: false,
  plateCalculator: true,
  rpeTracking: false,
  smartSupersetScrolling: false,
  inlineTimer: true,
  livePrNotification: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getWorkoutSettings as jest.Mock).mockResolvedValue(DEFAULTS);
});

describe('WorkoutSettingsScreen', () => {
  it('renders every setting row from the loaded settings', async () => {
    await render(<WorkoutSettingsScreen />);

    await waitFor(() => expect(screen.getByText('Keep Awake During Workout')).toBeTruthy());
    expect(screen.getByText('Plate Calculator')).toBeTruthy();
    expect(screen.getByText('RPE Tracking')).toBeTruthy();
    expect(screen.getByText('Smart Superset Scrolling')).toBeTruthy();
    expect(screen.getByText('Inline Timer')).toBeTruthy();
    expect(screen.getByText('Live Personal Record Notification')).toBeTruthy();
    expect(screen.getByText('Default Rest Timer')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('persists a toggle change immediately, keyed to the correct setting', async () => {
    (updateWorkoutSetting as jest.Mock).mockResolvedValue({ ...DEFAULTS, rpeTracking: true });

    await render(<WorkoutSettingsScreen />);
    await waitFor(() => expect(screen.getByText('RPE Tracking')).toBeTruthy());

    // Toggle rows render in a fixed order: keepAwake, plateCalculator, rpeTracking, ...
    const switches = screen.getAllByRole('switch');
    await fireEvent(switches[2], 'valueChange', true);

    await waitFor(() => expect(updateWorkoutSetting).toHaveBeenCalledWith('rpeTracking', true));
  });

  it('navigates back when Done is pressed', async () => {
    await render(<WorkoutSettingsScreen />);
    await waitFor(() => expect(screen.getByText('Done')).toBeTruthy());

    await fireEvent.press(screen.getByText('Done'));

    expect(router.back).toHaveBeenCalled();
  });

  it('navigates back when the back arrow is pressed', async () => {
    await render(<WorkoutSettingsScreen />);
    await fireEvent.press(screen.getByTestId('back-button'));

    expect(router.back).toHaveBeenCalled();
  });
});
