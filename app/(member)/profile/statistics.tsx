import { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { ListItem } from '../../../src/components/ListItem';
import { getMuscleVolumes } from '../../../src/features/progress/api';
import { getLoggedExercises } from '../../../src/features/exercises/api';
import { MuscleHeatmap } from '../../../src/features/progress/components/MuscleHeatmap';
import { spacing, typography } from '../../../src/theme';

export default function Statistics() {
  const [muscleVolumes, setMuscleVolumes] = useState<{ muscle: string; volume: number }[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getMuscleVolumes().then(setMuscleVolumes);
    getLoggedExercises().then(setExercises);
  }, []);

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <>
            <Text style={[typography.title, styles.heading]}>Statistics</Text>
            <MuscleHeatmap muscleVolumes={muscleVolumes} />
            <Text style={[typography.title, styles.sectionHeading]}>Exercises</Text>
          </>
        }
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem title={item.name} trailing="chevron" onPress={() => router.push(`/(member)/profile/exercises/${item.id}`)} />
        )}
        ListFooterComponent={
          <View>
            <Text style={[typography.title, styles.sectionHeading]}>Advanced statistics</Text>
            <ListItem
              title="Set count per muscle group"
              subtitle="Number of sets logged for each muscle group."
              icon="stats-chart-outline"
            />
            <ListItem
              title="Muscle distribution (Chart)"
              subtitle="Compare your current and previous muscle distributions."
              icon="analytics-outline"
              trailing="chevron"
              onPress={() => router.push('/(member)/profile/muscle-distribution')}
            />
            <ListItem
              title="Muscle distribution (Body)"
              subtitle="Weekly heat map of muscles worked."
              icon="body-outline"
              trailing="chevron"
              onPress={() => router.push('/(member)/profile/body-distribution')}
            />
            <ListItem title="Main exercises" subtitle="List of exercises you do most often." icon="barbell-outline" />
            <ListItem title="Leaderboard Exercises" subtitle="List of the leaderboard-eligible exercises." icon="trophy-outline" />
            <ListItem
              title="Monthly Report"
              subtitle="Recap of your monthly workouts and statistics."
              icon="document-text-outline"
              trailing="chevron"
              onPress={() => router.push('/(member)/profile/monthly-report')}
            />
          </View>
        }
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
});
