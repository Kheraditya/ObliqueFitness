import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { getRoutine, getRoutineVolumeHistory } from '../../../src/features/routines/api';
import type { Routine, VolumeHistoryPoint } from '../../../src/features/routines/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function RoutineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [history, setHistory] = useState<VolumeHistoryPoint[]>([]);

  useEffect(() => {
    if (!id) return;
    getRoutine(id).then(setRoutine);
    getRoutineVolumeHistory(id).then(setHistory);
  }, [id]);

  if (!routine) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>{routine.name}</Text>
      <Button title="Start Routine" onPress={() => {}} disabled />
      <Button title="Edit Routine" variant="secondary" onPress={() => router.push(`/(member)/routines/${routine.id}/edit`)} />
      <View style={styles.chartCard}>
        {history.length === 0 ? (
          <Text style={typography.subtitle}>No data yet.</Text>
        ) : (
          <VictoryChart theme={VictoryTheme.material} domainPadding={20}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryBar data={history.map((h) => ({ x: h.date, y: h.volume }))} />
          </VictoryChart>
        )}
      </View>
      <Text style={[typography.title, styles.sectionHeading]}>Exercises</Text>
      {routine.exercises.map((ex) => (
        <View key={ex.id} style={styles.exerciseRow}>
          <Text style={typography.body}>{ex.exerciseName}</Text>
          <Text style={typography.label}>
            {ex.targetSets} sets{ex.supersetGroup != null ? ` · Superset ${ex.supersetGroup}` : ''}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginTop: spacing.l,
    minHeight: 120,
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  exerciseRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
