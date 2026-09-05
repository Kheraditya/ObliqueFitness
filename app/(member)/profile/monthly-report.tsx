import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { PillTabs } from '../../../src/components/PillTabs';
import { RadarChart } from '../../../src/features/progress/components/RadarChart';
import { ComparisonStatTile } from '../../../src/features/progress/components/ComparisonStatTile';
import { getPeriodSummary, getSetsCountByMuscle, getMonthlyTotals, type PeriodSummary, type MonthlyTotal } from '../../../src/features/progress/reports';
import { groupCounts, type MuscleGroup } from '../../../src/features/progress/muscleGroups';
import { getWorkoutDates } from '../../../src/features/workout/api';
import { computeWeekStreak } from '../../../src/features/progress/streak';
import { buildMonthGrid, toLocalDateString } from './calendar';
import { colors, radius, spacing, typography } from '../../../src/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY_GROUPS: Record<MuscleGroup, number> = { Back: 0, Chest: 0, Legs: 0, Core: 0, Shoulders: 0, Arms: 0 };
const EMPTY_SUMMARY: PeriodSummary = { workouts: 0, durationSeconds: 0, volume: 0, sets: 0 };

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)}min`;
}

export default function MonthlyReport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [metric, setMetric] = useState('workouts');
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [currentSummary, setCurrentSummary] = useState(EMPTY_SUMMARY);
  const [previousSummary, setPreviousSummary] = useState(EMPTY_SUMMARY);
  const [currentGroups, setCurrentGroups] = useState(EMPTY_GROUPS);
  const [previousGroups, setPreviousGroups] = useState(EMPTY_GROUPS);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const monthStart = new Date(year, month, 1);
    const nextMonthStart = new Date(year, month + 1, 1);
    const prevMonthStart = new Date(year, month - 1, 1);
    const monthStartISO = monthStart.toISOString();
    const nextMonthStartISO = nextMonthStart.toISOString();
    const prevMonthStartISO = prevMonthStart.toISOString();

    getMonthlyTotals(12).then(setMonthlyTotals);
    getPeriodSummary(monthStartISO, nextMonthStartISO).then(setCurrentSummary);
    getPeriodSummary(prevMonthStartISO, monthStartISO).then(setPreviousSummary);
    getSetsCountByMuscle(monthStartISO, nextMonthStartISO).then((rows) => setCurrentGroups(groupCounts(rows)));
    getSetsCountByMuscle(prevMonthStartISO, monthStartISO).then((rows) => setPreviousGroups(groupCounts(rows)));
    getWorkoutDates().then((dates) => setWorkoutDates(new Set(dates)));
  }, [year, month]);

  const weekStreak = computeWeekStreak(Array.from(workoutDates), now);

  const chartData = monthlyTotals.map((m) => ({
    x: MONTH_NAMES[Number(m.month.slice(5, 7)) - 1].charAt(0),
    y: metric === 'workouts' ? m.workouts : metric === 'duration' ? Math.round(m.durationSeconds / 60) : m.volume,
  }));

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>{MONTH_NAMES[month]} Report</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView>
        <Text style={[typography.title, styles.monthTitle]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <View style={styles.chartCard}>
          <VictoryChart theme={VictoryTheme.material} domainPadding={20} height={200}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryBar data={chartData} />
          </VictoryChart>
        </View>
        <PillTabs
          options={[
            { key: 'workouts', label: 'Workouts' },
            { key: 'duration', label: 'Duration' },
            { key: 'volume', label: 'Volume' },
          ]}
          value={metric}
          onChange={setMetric}
        />

        <Text style={[typography.title, styles.sectionHeading]}>Summary</Text>
        <View style={styles.statsGrid}>
          <ComparisonStatTile label="Workouts" value={String(currentSummary.workouts)} previousValue={String(previousSummary.workouts)} />
          <ComparisonStatTile
            label="Duration"
            value={formatDuration(currentSummary.durationSeconds)}
            previousValue={formatDuration(previousSummary.durationSeconds)}
          />
          <ComparisonStatTile label="Volume" value={`${currentSummary.volume}kg`} previousValue={`${previousSummary.volume}kg`} />
          <ComparisonStatTile label="Sets" value={String(currentSummary.sets)} previousValue={String(previousSummary.sets)} />
        </View>

        <Text style={[typography.title, styles.sectionHeading]}>Workout Days Log</Text>
        <View style={styles.streakRow}>
          <Text style={styles.streakText}>{'\u{1F525}'} {weekStreak} Week Streak</Text>
        </View>
        <View style={styles.dayHeaderRow}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.dayHeaderText}>
              {d}
            </Text>
          ))}
        </View>
        {buildMonthGrid(year, month).map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              const dateStr = date ? toLocalDateString(date) : null;
              const hasWorkout = dateStr != null && workoutDates.has(dateStr);
              return (
                <View key={di} style={styles.dayCell}>
                  {date && <Text style={styles.dayText}>{date.getDate()}</Text>}
                  {hasWorkout && <View style={styles.workoutDot} />}
                </View>
              );
            })}
          </View>
        ))}

        <Text style={[typography.title, styles.sectionHeading]}>Muscle Distribution</Text>
        <RadarChart current={currentGroups} previous={previousGroups} />
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
  monthTitle: {
    marginBottom: spacing.m,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.s,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  streakRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  streakText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
  },
});
