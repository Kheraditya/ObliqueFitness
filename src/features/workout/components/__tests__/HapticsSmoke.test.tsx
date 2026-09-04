import * as Haptics from 'expo-haptics';

describe('expo-haptics smoke test', () => {
  it('module loads and its functions are callable under Jest', async () => {
    await expect(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).resolves.not.toThrow();
  });
});
