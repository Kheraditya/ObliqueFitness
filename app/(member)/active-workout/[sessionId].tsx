import { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import {
  getSessionExercises,
  getLoggedSets,
  logSet,
  updateWorkoutSet,
  finishSession,
} from '../../../src/features/workout/api';
import { getExercise } from '../../../src/features/exercises/api';
import { shouldStartRestTimer } from '../../../src/features/workout/restTimer';
import { SessionExerciseCard } from '../../../src/features/workout/components/SessionExerciseCard';
import { RestTimerBanner } from '../../../src/features/workout/components/RestTimerBanner';
import type { SessionExercise, LoggedSet } from '../../../src/features/workout/types';
import { typography, spacing } from '../../../src/theme';

export default function ActiveWorkout() {
  const { sessionId, addExerciseId } = useLocalSearchParams<{ sessionId: string; addExerciseId?: string }>();
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.title}>Workout</Text>
        <Button title="Finish" onPress={handleFinish} />
      </View>
      {error && <ErrorText>{error}</ErrorText>}
      {restSeconds !== null && (
        <RestTimerBanner key={restKey} seconds={restSeconds} onDismiss={() => setRestSeconds(null)} />
      )}
      <ScrollView>
        {exercises.map((exercise) => (
          <SessionExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            sets={sets.filter((s) => s.exerciseId === exercise.exerciseId)}
            onLogSet={(weight, reps, rpe) => handleLogSet(exercise.exerciseId, weight, reps, rpe)}
            onUpdateSet={handleUpdateSet}
          />
        ))}
      </ScrollView>
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/(member)/profile/exercises',
            params: { pickMode: 'true', returnTo: `/(member)/active-workout/${sessionId}` },
          })
        }
      />
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
});
