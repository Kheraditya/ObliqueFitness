import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface RestTimerBannerProps {
  seconds: number;
  onDismiss: () => void;
}

export function RestTimerBanner({ seconds, onDismiss }: RestTimerBannerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return (
    <View style={styles.banner}>
      <Text style={typography.body}>{remaining > 0 ? `Resting: ${remaining}s` : 'Rest complete'}</Text>
      <Button title="Dismiss" variant="secondary" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
});
