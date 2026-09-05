import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { getMuscleVolumes } from '../../../src/features/progress/api';
import { getLoggedExercises } from '../../../src/features/exercises/api';
import { MuscleHeatmap } from '../../../src/features/progress/components/MuscleHeatmap';
import { colors, spacing, typography } from '../../../src/theme';

export default function Statistics() {
  const [muscleVolumes, setMuscleVolumes] = useState<{ muscle: string; volume: number }[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getMuscleVolumes().then(setMuscleVolumes);
    getLoggedExercises().then(setExercises);
  }, []);

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Statistics</Text>
      <MuscleHeatmap muscleVolumes={muscleVolumes} />
      <Text style={[typography.title, styles.sectionHeading]}>Exercises</Text>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(member)/profile/exercises/${item.id}`)}>
            <Text style={typography.body}>{item.name}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
