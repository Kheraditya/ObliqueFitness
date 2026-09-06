import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter } from 'victory-native';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { PillTabs } from '../../../src/components/PillTabs';
import { ShareRoutineModal } from '../../../src/features/sharing/components/ShareRoutineModal';
import {
  deleteRoutine,
  getLatestRoutinePerformance,
  getRoutine,
  getRoutineVolumeHistory,
} from '../../../src/features/routines/api';
import { startSession } from '../../../src/features/workout/api';
import type { Routine, RoutinePerformance, VolumeHistoryPoint } from '../../../src/features/routines/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

type Metric = 'volume' | 'reps' | 'duration';

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsed);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} min`;
}

function metricValue(point: VolumeHistoryPoint, metric: Metric): number {
  if (metric === 'reps') return point.reps;
  if (metric === 'duration') return point.durationSeconds;
  return point.volume;
}

function metricLabel(value: number, metric: Metric): string {
  if (metric === 'reps') return `${value} reps`;
  if (metric === 'duration') return formatDuration(value);
  return `${Math.round(value).toLocaleString()} kg`;
}

export default function RoutineDetail() {
  const { id, returnTo, readOnly } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
    readOnly?: string;
  }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [history, setHistory] = useState<VolumeHistoryPoint[]>([]);
  const [latestPerformance, setLatestPerformance] = useState<RoutinePerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('volume');
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getRoutine(id), getRoutineVolumeHistory(id), getLatestRoutinePerformance(id)]).then(
      ([routineResult, historyResult, latestResult]) => {
        setRoutine(routineResult);
        setHistory(historyResult);
        setLatestPerformance(latestResult);
      }
    );
  }, [id]);

  const chartData = useMemo(
    () => history.map((point, index) => ({ x: index + 1, y: metricValue(point, metric) })),
    [history, metric]
  );

  if (!routine) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  const routineId = routine.id;
  const routineName = routine.name;
  const latestPoint = history[history.length - 1];
  const isReadOnly = readOnly === 'true';

  async function handleStartRoutine() {
    const { id: sessionId, error: startError } = await startSession(routineId);
    if (sessionId) {
      router.push(`/(member)/active-workout/${sessionId}`);
      return;
    }
    setError(startError);
  }

  async function handleDelete() {
    const { error: deleteError } = await deleteRoutine(routineId);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    router.replace('/(member)/workout');
  }

  function openMenu() {
    Alert.alert(routineName, undefined, [
      { text: 'Edit Routine', onPress: () => router.push(`/(member)/routines/${routineId}/edit`) },
      { text: 'Delete Routine', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable
              onPress={() => router.replace(returnTo || '/(member)/workout')}
              hitSlop={8}
              testID="routine-back"
            >
              <Ionicons name="arrow-back" size={25} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Routine</Text>}
          right={isReadOnly ? undefined :
            <View style={styles.headerActions}>
              <Pressable onPress={() => setShareOpen(true)} hitSlop={8} accessibilityLabel="Share routine">
                <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={openMenu} hitSlop={8} testID="routine-menu">
                <Ionicons name="ellipsis-horizontal" size={25} color={colors.textPrimary} />
              </Pressable>
            </View>
          }
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>{routine.name}</Text>
        <Text style={styles.byline}>{isReadOnly ? 'Member routine' : 'Your routine'} · {routine.exercises.length} exercises</Text>

        {!isReadOnly && <Button title="Start Routine" onPress={handleStartRoutine} style={styles.startButton} />}
        {error && <ErrorText>{error}</ErrorText>}

        <View style={styles.historyHeader}>
          <View style={styles.latestSummary}>
            <Text style={styles.latestValue}>
              {latestPoint ? metricLabel(metricValue(latestPoint, metric), metric) : 'No history'}
            </Text>
            {latestPoint && <Text style={styles.latestDate}>{formatDate(latestPoint.date)}</Text>}
          </View>
          <View style={styles.periodControl}>
            <Text style={styles.periodText}>Last 3 months</Text>
            <Ionicons name="chevron-down" size={17} color={colors.accent} />
          </View>
        </View>

        <View style={styles.chartArea}>
          {chartData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={27} color={colors.textSecondary} />
              <Text style={styles.emptyChartText}>Complete this routine to build your progress chart.</Text>
            </View>
          ) : (
            <VictoryChart height={190} padding={{ top: 16, bottom: 34, left: 48, right: 12 }} domainPadding={{ x: 24, y: 18 }}>
              <VictoryAxis
                tickFormat={(tick) => formatDate(history[Math.max(0, Number(tick) - 1)]?.date ?? '')}
                style={axisStyles}
              />
              <VictoryAxis dependentAxis tickCount={3} style={axisStyles} />
              <VictoryLine data={chartData} style={{ data: { stroke: colors.accent, strokeWidth: 2 } }} />
              <VictoryScatter data={chartData} size={4} style={{ data: { fill: colors.accent } }} />
            </VictoryChart>
          )}
        </View>

        <PillTabs
          options={[
            { key: 'volume', label: 'Volume' },
            { key: 'reps', label: 'Reps' },
            { key: 'duration', label: 'Duration' },
          ]}
          value={metric}
          onChange={(value) => setMetric(value as Metric)}
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {latestPerformance && <Text style={styles.performanceDate}>Last performed {formatDate(latestPerformance.date)}</Text>}
          </View>
          {!isReadOnly && (
            <Pressable onPress={() => router.push(`/(member)/routines/${routineId}/edit`)} hitSlop={8}>
              <Text style={styles.editText}>Edit Routine</Text>
            </Pressable>
          )}
        </View>

        {routine.exercises.map((exercise) => {
          const performedSets = latestPerformance?.sets.filter((set) => set.exerciseId === exercise.exerciseId);
          const hasPerformedSets = !!performedSets?.length;
          const displaySets = hasPerformedSets
            ? performedSets
            : Array.from({ length: exercise.targetSets }, (_, index) => ({
                exerciseId: exercise.exerciseId,
                setNumber: index + 1,
                weight: null,
                reps: null,
              }));

          return (
            <View key={exercise.id} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                {exercise.imageUri ? (
                  <Image source={{ uri: exercise.imageUri }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.thumbnailFallback}>
                    <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              </View>
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, styles.setCol]}>SET</Text>
                <Text style={[styles.setHeaderText, styles.valueCol]}>KG</Text>
                <Text style={[styles.setHeaderText, styles.valueCol]}>REPS</Text>
                <View style={styles.doneCol} />
              </View>
              {displaySets.map((set, index) => (
                <View
                  key={`${exercise.exerciseId}-${set.setNumber}-${index}`}
                  style={[styles.performanceRow, index % 2 === 1 && styles.performanceRowAlt]}
                >
                  <Text style={[styles.performanceCell, styles.setCol]}>{set.setNumber}</Text>
                  <Text style={[styles.performanceCell, styles.valueCol]}>{set.weight ?? '–'}</Text>
                  <Text style={[styles.performanceCell, styles.valueCol]}>{set.reps ?? '–'}</Text>
                  <View style={[styles.historyCheck, hasPerformedSets && styles.historyCheckDone]}>
                    {hasPerformedSets && <Ionicons name="checkmark" size={18} color={colors.textPrimary} />}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <ShareRoutineModal
        visible={shareOpen}
        routineId={routineId}
        routineName={routineName}
        onClose={() => setShareOpen(false)}
      />
    </Screen>
  );
}

const axisStyles = {
  axis: { stroke: colors.border },
  grid: { stroke: colors.border, strokeOpacity: 0.45 },
  tickLabels: { fill: colors.textSecondary, fontSize: 10, padding: 7 },
};

const styles = StyleSheet.create({
  scrollContent: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  heading: { color: colors.textPrimary, fontSize: 28, fontWeight: '800' },
  byline: { color: colors.textSecondary, fontSize: 15, marginTop: spacing.xs },
  startButton: { minHeight: 52, marginTop: spacing.l },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.s,
  },
  latestSummary: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s },
  latestValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  latestDate: { color: colors.accent, fontSize: 15 },
  periodControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  periodText: { color: colors.accent, fontSize: 15 },
  chartArea: { minHeight: 190, marginHorizontal: -spacing.s },
  emptyChart: {
    minHeight: 170,
    borderRadius: radius.l,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.s,
  },
  emptyChartText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  sectionTitle: { color: colors.textSecondary, fontSize: 18, fontWeight: '600' },
  performanceDate: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  editText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  exerciseBlock: {
    marginTop: spacing.m,
    paddingBottom: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.m },
  thumbnail: { width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surfaceElevated },
  thumbnailFallback: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: { flex: 1, color: colors.accent, fontSize: 18, fontWeight: '700' },
  setHeader: { flexDirection: 'row', paddingHorizontal: spacing.m, paddingBottom: spacing.s },
  setHeaderText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  setCol: { width: 64, textAlign: 'left' },
  valueCol: { flex: 1, textAlign: 'center' },
  doneCol: { width: 36 },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.m,
    borderRadius: radius.s,
  },
  performanceRowAlt: { backgroundColor: colors.surface },
  performanceCell: { color: colors.textPrimary, fontSize: 17 },
  historyCheck: {
    width: 32,
    height: 32,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCheckDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
