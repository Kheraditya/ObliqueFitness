import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { DashboardTile } from '../../src/components/DashboardTile';
import { RoutineCard } from '../../src/features/routines/components/RoutineCard';
import { ActiveWorkoutBar } from '../../src/features/workout/components/ActiveWorkoutBar';
import { listRoutines, deleteRoutine } from '../../src/features/routines/api';
import { startSession, getActiveSession, getSessionExercises, discardSession } from '../../src/features/workout/api';
import { colors, radius, typography, spacing } from '../../src/theme';

interface ActiveSessionInfo {
  id: string;
  startedAt: string;
  exerciseCount: number;
}

export default function Workout() {
  const [routines, setRoutines] = useState<{ id: string; name: string; exercisePreview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routinesExpanded, setRoutinesExpanded] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  const refresh = useCallback(() => {
    listRoutines().then(setRoutines);
  }, []);

  const refreshActiveSession = useCallback(() => {
    getActiveSession().then((session) => {
      if (!session) {
        setActiveSession(null);
        return;
      }
      // Narrow race: if this session is discarded elsewhere (another device, another tab)
      // between the getActiveSession() lookup above and this call, getSessionExercises falls
      // back to exercises: [] for a session it can't find rather than signaling "not found" --
      // so the bar could briefly show a stale "No exercise" session until the next refetch.
      // Acceptable for now since Resume/Discard on a since-deleted session fail gracefully
      // (FK/no-op), but flagging here rather than silently relying on it.
      getSessionExercises(session.id).then(({ exercises }) => {
        // Bail out with the same object reference when nothing actually changed, so a refetch
        // that finds the same in-progress session (e.g. every screen focus) doesn't force a
        // re-render -- refocusing without any real change should be a no-op, not a state churn.
        const exerciseCount = exercises.length;
        setActiveSession((prev) =>
          prev && prev.id === session.id && prev.startedAt === session.startedAt && prev.exerciseCount === exerciseCount
            ? prev
            : { id: session.id, startedAt: session.startedAt, exerciseCount }
        );
      });
    });
  }, []);

  useFocusEffect(refresh);
  useFocusEffect(refreshActiveSession);

  async function handleStartEmpty() {
    const { id, error: startError } = await startSession(null);
    if (id) {
      router.push(`/(member)/active-workout/${id}`);
      return;
    }
    setError(startError);
  }

  async function handleStartRoutine(routineId: string) {
    const { id, error: startError } = await startSession(routineId);
    if (id) {
      router.push(`/(member)/active-workout/${id}`);
      return;
    }
    setError(startError);
  }

  async function handleDeleteRoutine(routineId: string) {
    const { error: deleteError } = await deleteRoutine(routineId);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    refresh();
  }

  function handleResumeActiveWorkout() {
    if (!activeSession) return;
    router.push(`/(member)/active-workout/${activeSession.id}`);
  }

  async function handleDiscardActiveWorkout() {
    if (!activeSession) return;
    const { error: discardError } = await discardSession(activeSession.id);
    if (discardError) {
      setError(discardError);
      return;
    }
    refreshActiveSession();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={typography.title}>Workout</Text>
          <View style={styles.chevronBadge}>
            <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
          </View>
        </View>
        <Pressable onPress={refresh} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Button title="Start Empty Workout" onPress={handleStartEmpty} variant="dark" icon="add" align="left" />
      {error && <ErrorText>{error}</ErrorText>}
      <View style={styles.sectionHeadingRow}>
        <Text style={[typography.title, styles.sectionHeading]}>Routines</Text>
        <View style={styles.folderIconWrap}>
          <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
          <View style={styles.folderAddBadge}>
            <Ionicons name="add" size={10} color={colors.textPrimary} />
          </View>
        </View>
      </View>
      <View style={styles.tileRow}>
        <DashboardTile label="New Routine" icon="clipboard-outline" onPress={() => router.push('/(member)/routines/new')} />
        <DashboardTile label="Explore" icon="search-outline" onPress={() => {}} disabled />
      </View>

      <Pressable style={styles.myRoutinesRow} onPress={() => setRoutinesExpanded((prev) => !prev)}>
        <Ionicons name={routinesExpanded ? 'caret-down' : 'caret-forward'} size={13} color={colors.textSecondary} />
        <Text style={styles.myRoutinesLabel}>My Routines ({routines.length})</Text>
      </Pressable>

      {routinesExpanded && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={activeSession ? styles.scrollContentWithBar : undefined}
        >
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              name={routine.name}
              exercisePreview={routine.exercisePreview}
              onStart={() => handleStartRoutine(routine.id)}
              onEdit={() => router.push(`/(member)/routines/${routine.id}/edit`)}
              onDelete={() => handleDeleteRoutine(routine.id)}
            />
          ))}
        </ScrollView>
      )}

      {activeSession && (
        <View style={styles.activeBarWrap}>
          <ActiveWorkoutBar
            startedAt={activeSession.startedAt}
            exerciseCount={activeSession.exerciseCount}
            onResume={handleResumeActiveWorkout}
            onDiscard={handleDiscardActiveWorkout}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContentWithBar: {
    // Leaves room so the last routine card doesn't sit hidden behind the floating
    // ActiveWorkoutBar, which is absolutely positioned over the bottom of the scroll area.
    paddingBottom: 88,
  },
  activeBarWrap: {
    position: 'absolute',
    left: spacing.l,
    right: spacing.l,
    bottom: spacing.m,
  },
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
    gap: spacing.s,
  },
  chevronBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  sectionHeading: {
    fontSize: 20,
  },
  folderIconWrap: {
    width: 24,
    height: 24,
  },
  folderAddBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  myRoutinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  myRoutinesLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
