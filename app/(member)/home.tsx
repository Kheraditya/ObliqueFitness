import { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { getHomeSummary, type HomeSummary } from '../../src/features/progress/api';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function Home() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    getHomeSummary().then(setSummary);
  }, []);

  const topMuscles = (summary?.muscleVolumes ?? [])
    .slice()
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);
  const maxMuscleVolume = Math.max(1, ...topMuscles.map((m) => m.volume));

  return (
    <Screen>
      <ScrollView>
        <Text style={[typography.title, styles.heading]}>Welcome back</Text>
        <View style={styles.statsRow}>
          <StatTile label="Workouts" value={String(summary?.workoutCountThisWeek ?? 0)} />
          <StatTile
            label="Volume"
            value={
              summary?.volumeChangePct == null
                ? '–'
                : `${summary.volumeChangePct > 0 ? '+' : ''}${summary.volumeChangePct}%`
            }
          />
          <StatTile label="Streak" value={`${summary?.streakDays ?? 0}d`} />
        </View>
        <Text style={[typography.title, styles.sectionHeading]}>Muscle Balance</Text>
        {topMuscles.length === 0 ? (
          <Text style={typography.subtitle}>Log a workout to see your muscle balance.</Text>
        ) : (
          <View style={styles.barList}>
            {topMuscles.map((m) => (
              <View key={m.muscle} style={styles.barRow}>
                <Text style={styles.barLabel}>{m.muscle}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(m.volume / maxMuscleVolume) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tileLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  barList: {
    gap: spacing.s,
  },
  barRow: {
    gap: spacing.xs,
  },
  barLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
});
