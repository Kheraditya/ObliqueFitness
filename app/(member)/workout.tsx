import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { DashboardTile } from '../../src/components/DashboardTile';
import { RoutineCard } from '../../src/features/routines/components/RoutineCard';
import { listRoutines, deleteRoutine } from '../../src/features/routines/api';
import { startSession } from '../../src/features/workout/api';
import { colors, typography, spacing } from '../../src/theme';

export default function Workout() {
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routinesExpanded, setRoutinesExpanded] = useState(true);

  const refresh = useCallback(() => {
    listRoutines().then(setRoutines);
  }, []);

  useFocusEffect(refresh);

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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={typography.title}>Workout</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
        </View>
        <Pressable onPress={refresh} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Button title="Start Empty Workout" onPress={handleStartEmpty} variant="dark" icon="add" align="left" />
      {error && <ErrorText>{error}</ErrorText>}
      <View style={styles.sectionHeadingRow}>
        <Text style={[typography.title, styles.sectionHeading]}>Routines</Text>
        <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.tileRow}>
        <DashboardTile label="New Routine" icon="clipboard-outline" onPress={() => router.push('/(member)/routines/new')} />
        <DashboardTile label="Explore" icon="search-outline" onPress={() => {}} disabled />
      </View>

      <Pressable style={styles.myRoutinesRow} onPress={() => setRoutinesExpanded((prev) => !prev)}>
        <Ionicons name={routinesExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSecondary} />
        <Text style={styles.myRoutinesLabel}>My Routines ({routines.length})</Text>
      </Pressable>

      {routinesExpanded && (
        <ScrollView>
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              name={routine.name}
              onStart={() => handleStartRoutine(routine.id)}
              onEdit={() => router.push(`/(member)/routines/${routine.id}/edit`)}
              onDelete={() => handleDeleteRoutine(routine.id)}
            />
          ))}
        </ScrollView>
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
    marginBottom: spacing.s,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  tileRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  myRoutinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  myRoutinesLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
