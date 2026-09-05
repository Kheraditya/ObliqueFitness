import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { ListItem } from '../../../src/components/ListItem';
import { getMuscleVolumes } from '../../../src/features/progress/api';
import { getLoggedExercises } from '../../../src/features/exercises/api';
import { MuscleHeatmap } from '../../../src/features/progress/components/MuscleHeatmap';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function Statistics() {
  const [muscleVolumes, setMuscleVolumes] = useState<{ muscle: string; volume: number }[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getMuscleVolumes().then(setMuscleVolumes);
    getLoggedExercises().then(setExercises);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.graphLabelRow}>
              <Text style={typography.body}>Last 7 days body graph</Text>
              <View style={styles.helpIcon}>
                <Ionicons name="help" size={16} color={colors.textSecondary} />
              </View>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  headerSpacer: {
    width: 22,
  },
  graphLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  helpIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
});
