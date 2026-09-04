import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

import * as Haptics from 'expo-haptics';
import { RestTimerBanner } from '../RestTimerBanner';

describe('RestTimerBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts down and triggers haptics at zero', async () => {
    await render(<RestTimerBanner seconds={2} onDismiss={jest.fn()} />);

    expect(screen.getByText('Resting: 2s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Resting: 1s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Rest complete')).toBeTruthy();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('calls onDismiss when dismissed', async () => {
    const onDismiss = jest.fn();
    await render(<RestTimerBanner seconds={30} onDismiss={onDismiss} />);

    await fireEvent.press(screen.getByText('Dismiss'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
