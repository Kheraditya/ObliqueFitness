import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Body from 'react-native-body-highlighter';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import {
  getSessionExercises,
  getLoggedSets,
  logSet,
  updateWorkoutSet,
  finishSession,
  discardSession,
} from '../../../src/features/workout/api';
import { getExercise } from '../../../src/features/exercises/api';
import { shouldStartRestTimer } from '../../../src/features/workout/restTimer';
import { SessionExerciseCard } from '../../../src/features/workout/components/SessionExerciseCard';
import { RestTimerBanner } from '../../../src/features/workout/components/RestTimerBanner';
import { getWorkoutSettings } from '../../../src/features/workout/settings';
import type { SessionExercise, LoggedSet } from '../../../src/features/workout/types';
import { colors, spacing, typography } from '../../../src/theme';

const KEEP_AWAKE_TAG = 'active-workout';

function formatElapsed(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function ActiveWorkout() {
  const { sessionId, addExerciseId } = useLocalSearchParams<{ sessionId: string; addExerciseId?: string }>();
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRpe, setShowRpe] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWorkoutSettings().then((settings) => {
      if (cancelled) return;
      setShowRpe(settings.rpeTracking);
      if (settings.keepAwake) {
        activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      }
    });
    return () => {
      cancelled = true;
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getSessionExercises(sessionId), getLoggedSets(sessionId)])
      .then(([sessionData, loggedSets]) => {
        setExercises(sessionData.exercises);
        setStartedAt(sessionData.startedAt);
        setSets(loggedSets);
        setLoaded(true);
      })
      .catch(() => {
        setError('Failed to load workout.');
      });
  }, [sessionId]);

  useEffect(() => {
    if (!addExerciseId || !loaded) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => {
        if (prev.some((e) => e.exerciseId === exercise.id)) return prev;
        return [
          ...prev,
          { exerciseId: exercise.id, exerciseName: exercise.name, order: prev.length, restSeconds: 90, supersetGroup: null },
        ];
      });
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId, loaded]);

  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  async function handleLogSet(exerciseId: string, weight: number | null, reps: number | null, rpe: number | null) {
    const existingCount = sets.filter((s) => s.exerciseId === exerciseId).length;
    const { error: logError } = await logSet(sessionId, exerciseId, existingCount + 1, weight, reps, rpe);
    if (logError) {
      setError(logError);
      return;
    }
    const updated = await getLoggedSets(sessionId);
    setSets(updated);

    const index = exercises.findIndex((e) => e.exerciseId === exerciseId);
    if (index !== -1 && shouldStartRestTimer(exercises, index)) {
      setRestSeconds(exercises[index].restSeconds);
      setRestKey((k) => k + 1);
    }
  }

  async function handleUpdateSet(setId: string, weight: number | null, reps: number | null, rpe: number | null) {
    const { error: updateError } = await updateWorkoutSet(setId, weight, reps, rpe);
    if (updateError) {
      setError(updateError);
      return;
    }
    const updated = await getLoggedSets(sessionId);
    setSets(updated);
  }

  async function handleFinish() {
    if (!startedAt) return;
    const { error: finishError } = await finishSession(sessionId, startedAt);
    if (finishError) {
      setError(finishError);
      return;
    }
    router.replace('/(member)/workout');
  }

  function handleDiscard() {
    Alert.alert('Discard Workout', 'This will permanently delete this workout and all logged sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          const { error: discardError } = await discardSession(sessionId);
          if (discardError) {
            setError(discardError);
            return;
          }
          router.replace('/(member)/workout');
        },
      },
    ]);
  }

  function handleAddExercise() {
    router.push({
      pathname: '/(member)/profile/exercises',
      params: { pickMode: 'true', returnTo: `/(member)/active-workout/${sessionId}` },
    });
  }

  const volume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
          <Text style={typography.body}>Log Workout</Text>
        </View>
        <View style={styles.headerActions}>
          <Ionicons name="time-outline" size={22} color={colors.textPrimary} style={styles.clockIcon} />
          <Button title="Finish" onPress={handleFinish} />
        </View>
      </View>
      {error && <ErrorText>{error}</ErrorText>}

      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValueAccent}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{volume} kg</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Sets</Text>
          <Text style={styles.statValue}>{sets.length}</Text>
        </View>
        <View style={styles.miniBodyRow}>
          <Body data={[]} side="front" scale={0.35} border="none" defaultFill={colors.surfaceElevated} />
          <Body data={[]} side="back" scale={0.35} border="none" defaultFill={colors.surfaceElevated} />
        </View>
      </View>

      {restSeconds !== null && (
        <RestTimerBanner key={restKey} seconds={restSeconds} onDismiss={() => setRestSeconds(null)} />
      )}

      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Get started</Text>
          <Text style={styles.emptySubtitle}>Add an exercise to start your workout</Text>
          <Button title="Add Exercise" icon="add" onPress={handleAddExercise} />
          <View style={styles.footerRow}>
            <View style={styles.footerButton}>
              <Button title="Settings" variant="dark" onPress={() => router.push('/(member)/active-workout/settings')} />
            </View>
            <View style={styles.footerButton}>
              <Button title="Discard Workout" variant="dark" textColor={colors.danger} onPress={handleDiscard} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <ScrollView>
            {exercises.map((exercise) => (
              <SessionExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                sets={sets.filter((s) => s.exerciseId === exercise.exerciseId)}
                onLogSet={(weight, reps, rpe) => handleLogSet(exercise.exerciseId, weight, reps, rpe)}
                onUpdateSet={handleUpdateSet}
                showRpe={showRpe}
              />
            ))}
          </ScrollView>
          <Button title="Add Exercise" variant="secondary" onPress={handleAddExercise} />
          <View style={styles.footerRow}>
            <View style={styles.footerButton}>
              <Button title="Settings" variant="dark" onPress={() => router.push('/(member)/active-workout/settings')} />
            </View>
            <View style={styles.footerButton}>
              <Button title="Discard Workout" variant="dark" textColor={colors.danger} onPress={handleDiscard} />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  clockIcon: {
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.m,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statValueAccent: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  miniBodyRow: {
    flexDirection: 'row',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.s,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.m,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.s,
    width: '100%',
    marginTop: spacing.s,
  },
  footerButton: {
    flex: 1,
  },
});
