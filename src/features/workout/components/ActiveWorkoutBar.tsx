import { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { formatElapsed } from '../format';
import { colors, radius, spacing } from '../../../theme';

interface ActiveWorkoutBarProps {
  startedAt: string;
  exerciseCount: number;
  onResume: () => void;
  onDiscard: () => void;
}

// A persistent "workout in progress" bar shown on the Workout tab whenever the user has
// navigated away from Active Workout without finishing or discarding it -- mirrors a
// now-playing-style mini player so the in-progress session is never silently lost from view.
export function ActiveWorkoutBar({ startedAt, exerciseCount, onResume, onDiscard }: ActiveWorkoutBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <>
      <Pressable style={styles.bar} onPress={onResume} testID="active-workout-bar">
        <View style={styles.expandBadge}>
          <Ionicons name="chevron-up" size={16} color={colors.textPrimary} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <View style={styles.liveDot} />
            <Text style={styles.title}>Workout {formatElapsed(elapsedSeconds)}</Text>
          </View>
          <Text style={styles.subtitle}>{exerciseCount === 0 ? 'No exercise' : `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`}</Text>
        </View>
        <Pressable
          onPress={() => setConfirmingDiscard(true)}
          hitSlop={8}
          testID="active-workout-bar-discard"
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </Pressable>

      <ConfirmModal
        visible={confirmingDiscard}
        title="Discard Workout"
        message="This will permanently delete this workout and all logged sets."
        confirmLabel="Discard Workout"
        onConfirm={() => {
          setConfirmingDiscard(false);
          onDiscard();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.l,
    padding: spacing.m,
  },
  expandBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
