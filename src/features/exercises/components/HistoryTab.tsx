import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { getExerciseHistory } from '../api';
import type { HistoryEntry } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

export function HistoryTab({ exerciseId }: { exerciseId: string }) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    getExerciseHistory(exerciseId).then(setHistory);
  }, [exerciseId]);

  if (history === null) return null;

  if (history.length === 0) {
    return <Text style={typography.subtitle}>No history yet.</Text>;
  }

  return (
    <View>
      {history.map((entry) => (
        <View key={entry.sessionId} style={styles.card}>
          <Text style={typography.label}>{new Date(entry.date).toLocaleDateString()}</Text>
          {entry.sets.map((set, index) => (
            <Text key={index} style={typography.body}>
              Set {index + 1}: {set.weight ?? '-'} kg x {set.reps ?? '-'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
});
