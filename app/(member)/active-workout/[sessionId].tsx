import { useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Body from "react-native-body-highlighter";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Screen } from "../../../src/components/Screen";
import { HeaderBar } from "../../../src/components/HeaderBar";
import { Button } from "../../../src/components/Button";
import { ErrorText } from "../../../src/components/ErrorText";
import { ConfirmModal } from "../../../src/components/ConfirmModal";
import {
  getSessionExercises,
  getLoggedSets,
  logSet,
  updateWorkoutSet,
  finishSession,
  discardSession,
} from "../../../src/features/workout/api";
import { getExercise } from "../../../src/features/exercises/api";
import { shouldStartRestTimer } from "../../../src/features/workout/restTimer";
import { SessionExerciseCard } from "../../../src/features/workout/components/SessionExerciseCard";
import { RestTimerBanner } from "../../../src/features/workout/components/RestTimerBanner";
import { getWorkoutSettings } from "../../../src/features/workout/settings";
import { formatElapsed } from "../../../src/features/workout/format";
import type {
  SessionExercise,
  LoggedSet,
} from "../../../src/features/workout/types";
import { colors, spacing, typography } from "../../../src/theme";

const KEEP_AWAKE_TAG = "active-workout";

export default function ActiveWorkout() {
  const { sessionId, addExerciseId } = useLocalSearchParams<{
    sessionId: string;
    addExerciseId?: string;
  }>();
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRpe, setShowRpe] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

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
        setError("Failed to load workout.");
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
          {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            order: prev.length,
            restSeconds: 90,
            supersetGroup: null,
          },
        ];
      });
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId, loaded]);

  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const tick = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleMinimize();
      return true;
    });
    return () => subscription.remove();
  }, []);

  // Leaves the workout in progress rather than discarding it -- the session stays open in the
  // background and resurfaces as a resumable bar on the Workout tab (ActiveWorkoutBar).
  function handleMinimize() {
    router.replace("/(member)/workout");
  }

  async function handleLogSet(
    exerciseId: string,
    weight: number | null,
    reps: number | null,
    rpe: number | null,
  ) {
    const existingCount = sets.filter(
      (s) => s.exerciseId === exerciseId,
    ).length;
    const { error: logError } = await logSet(
      sessionId,
      exerciseId,
      existingCount + 1,
      weight,
      reps,
      rpe,
    );
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

  async function handleUpdateSet(
    setId: string,
    weight: number | null,
    reps: number | null,
    rpe: number | null,
  ) {
    const { error: updateError } = await updateWorkoutSet(
      setId,
      weight,
      reps,
      rpe,
    );
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
    router.replace("/(member)/workout");
  }

  function handleDiscard() {
    setConfirmingDiscard(true);
  }

  async function confirmDiscard() {
    setConfirmingDiscard(false);
    const { error: discardError } = await discardSession(sessionId);
    if (discardError) {
      setError(discardError);
      return;
    }
    router.replace("/(member)/workout");
  }

  function handleAddExercise() {
    router.push({
      pathname: "/(member)/profile/exercises",
      params: {
        pickMode: "true",
        returnTo: `/(member)/active-workout/${sessionId}`,
      },
    });
  }

  const volume = sets.reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0,
  );

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable style={styles.titleRow} onPress={handleMinimize} hitSlop={8}>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textPrimary}
              />
              <Text style={typography.headerTitle}>Log Workout</Text>
            </Pressable>
          }
          right={
            <View style={styles.headerActions}>
              <Ionicons
                name="stopwatch-outline"
                size={24}
                color={colors.textPrimary}
              />
              <Button
                title="Finish"
                onPress={handleFinish}
                style={styles.noMarginTop}
              />
            </View>
          }
        />
      }
    >
      {error && <ErrorText>{error}</ErrorText>}

      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValueAccent}>
            {formatElapsed(elapsedSeconds)}
          </Text>
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
          <Body
            data={[]}
            side="front"
            scale={0.15}
            border="none"
            defaultFill={colors.surfaceElevated}
          />
          <Body
            data={[]}
            side="back"
            scale={0.15}
            border="none"
            defaultFill={colors.surfaceElevated}
          />
        </View>
      </View>

      {restSeconds !== null && (
        <RestTimerBanner
          key={restKey}
          seconds={restSeconds}
          onDismiss={() => setRestSeconds(null)}
        />
      )}

      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="barbell-outline"
            size={52}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Get started</Text>
          <Text style={styles.emptySubtitle}>
            Add an exercise to start your workout
          </Text>
          <Button title="Add Exercise" icon="add" onPress={handleAddExercise} />
          <View style={styles.footerRow}>
            <View style={styles.footerButton}>
              <Button
                title="Settings"
                variant="dark"
                onPress={() => router.push("/(member)/active-workout/settings")}
                style={styles.noMarginTop}
              />
            </View>
            <View style={styles.footerButton}>
              <Button
                title="Discard Workout"
                variant="dark"
                textColor={colors.danger}
                onPress={handleDiscard}
                style={styles.noMarginTop}
              />
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
                onLogSet={(weight, reps, rpe) =>
                  handleLogSet(exercise.exerciseId, weight, reps, rpe)
                }
                onUpdateSet={handleUpdateSet}
                showRpe={showRpe}
              />
            ))}
          </ScrollView>
          <Button
            title="Add Exercise"
            variant="secondary"
            onPress={handleAddExercise}
          />
          <View style={styles.footerRow}>
            <View style={styles.footerButton}>
              <Button
                title="Settings"
                variant="dark"
                onPress={() => router.push("/(member)/active-workout/settings")}
                style={styles.noMarginTop}
              />
            </View>
            <View style={styles.footerButton}>
              <Button
                title="Discard Workout"
                variant="dark"
                textColor={colors.danger}
                onPress={handleDiscard}
                style={styles.noMarginTop}
              />
            </View>
          </View>
        </>
      )}

      <ConfirmModal
        visible={confirmingDiscard}
        title="Discard Workout"
        message="This will permanently delete this workout and all logged sets."
        confirmLabel="Discard Workout"
        onConfirm={confirmDiscard}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noMarginTop: {
    marginTop: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
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
    fontSize: 19,
    fontWeight: "700",
  },
  statValueAccent: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: "700",
  },
  miniBodyRow: {
    flexDirection: "row",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.s,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.m,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.m,
  },
  footerRow: {
    flexDirection: "row",
    gap: spacing.m,
    width: "100%",
    marginTop: spacing.m,
  },
  footerButton: {
    flex: 1,
  },
});
