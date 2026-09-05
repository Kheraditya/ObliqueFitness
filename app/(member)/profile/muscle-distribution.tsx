import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { RadarChart } from '../../../src/features/progress/components/RadarChart';
import { ComparisonStatTile } from '../../../src/features/progress/components/ComparisonStatTile';
import { getPeriodSummary, getSetsCountByMuscle, type PeriodSummary } from '../../../src/features/progress/reports';
import { groupCounts, type MuscleGroup } from '../../../src/features/progress/muscleGroups';
import { colors, spacing, typography } from '../../../src/theme';

const EMPTY_GROUPS: Record<MuscleGroup, number> = { Back: 0, Chest: 0, Legs: 0, Core: 0, Shoulders: 0, Arms: 0 };
const EMPTY_SUMMARY: PeriodSummary = { workouts: 0, durationSeconds: 0, volume: 0, sets: 0 };

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)}min`;
}

export default function MuscleDistribution() {
  const [current, setCurrent] = useState(EMPTY_GROUPS);
  const [previous, setPrevious] = useState(EMPTY_GROUPS);
  const [currentSummary, setCurrentSummary] = useState(EMPTY_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState(EMPTY_SUMMARY);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 30);

    const nowISO = now.toISOString();
    const startISO = start.toISOString();
    const prevStartISO = prevStart.toISOString();

    getSetsCountByMuscle(startISO, nowISO).then((bySpecific) => setCurrent(groupCounts(bySpecific)));
    getSetsCountByMuscle(prevStartISO, startISO).then((bySpecific) => setPrevious(groupCounts(bySpecific)));
    getPeriodSummary(startISO, nowISO).then(setCurrentSummary);
    getPeriodSummary(prevStartISO, startISO).then(setPreviousSummary);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Muscle distribution</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView>
        <Text style={styles.rangeLabel}>Last 30 days</Text>
        <RadarChart current={current} previous={previous} />
        <View style={styles.statsGrid}>
          <ComparisonStatTile
            label="Workouts"
            value={String(currentSummary.workouts)}
            previousValue={String(previousSummary.workouts)}
          />
          <ComparisonStatTile
            label="Duration"
            value={formatDuration(currentSummary.durationSeconds)}
            previousValue={formatDuration(previousSummary.durationSeconds)}
          />
          <ComparisonStatTile
            label="Volume"
            value={`${currentSummary.volume}kg`}
            previousValue={`${previousSummary.volume}kg`}
          />
          <ComparisonStatTile
            label="Sets"
            value={String(currentSummary.sets)}
            previousValue={String(previousSummary.sets)}
          />
        </View>
      </ScrollView>
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
  rangeLabel: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: spacing.m,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.l,
  },
});
