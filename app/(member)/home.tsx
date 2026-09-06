import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { getHomeSummary, type HomeSummary } from '../../src/features/progress/api';
import {
  connectHealthApps,
  getDailyHealthSummary,
  openHealthAppsSettings,
  openHealthConnectStore,
  type DailyHealthSummary,
} from '../../src/features/health/api';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function Home() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [health, setHealth] = useState<DailyHealthSummary | null>(null);
  const [connectingHealth, setConnectingHealth] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getHomeSummary(), getDailyHealthSummary()]).then(([workoutSummary, healthSummary]) => {
        setSummary(workoutSummary);
        setHealth(healthSummary);
      });
    }, [])
  );

  const topMuscles = (summary?.muscleVolumes ?? [])
    .slice()
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);
  const maxMuscleVolume = Math.max(1, ...topMuscles.map((m) => m.volume));

  async function handleConnectHealth() {
    setConnectingHealth(true);
    setHealth(await connectHealthApps());
    setConnectingHealth(false);
  }

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

        <View style={styles.healthHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>DAILY ACTIVITY</Text>
            <Text style={styles.healthTitle}>Health & Wellness</Text>
          </View>
          {health?.status === 'connected' && (
            <Pressable onPress={() => openHealthAppsSettings().catch(() => undefined)} hitSlop={8} accessibilityLabel="Health Connect settings">
              <Ionicons name="settings-outline" size={21} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {!health ? (
          <View style={styles.healthLoading}><ActivityIndicator color={colors.accent} /></View>
        ) : health.status === 'connected' ? (
          <View style={styles.healthPanel}>
            <View style={styles.stepsHero}>
              <View style={styles.stepsIcon}><Ionicons name="footsteps" size={25} color={colors.accent} /></View>
              <View><Text style={styles.stepsValue}>{(health.steps ?? 0).toLocaleString()}</Text><Text style={styles.healthLabel}>STEPS TODAY</Text></View>
              <View style={styles.connectedPill}><View style={styles.connectedDot} /><Text style={styles.connectedText}>Connected</Text></View>
            </View>
            <View style={styles.healthGrid}>
              <HealthMetric icon="navigate-outline" label="Distance" value={health.distanceKm == null ? '—' : `${health.distanceKm.toFixed(1)} km`} />
              <HealthMetric icon="flame-outline" label="Active calories" value={health.activeCalories == null ? '—' : `${health.activeCalories} kcal`} />
              <HealthMetric icon="heart-outline" label="Avg. heart rate" value={health.averageHeartRate == null ? '—' : `${health.averageHeartRate} bpm`} />
              <HealthMetric icon="moon-outline" label="Sleep · 24h" value={health.sleepMinutes == null ? '—' : formatSleep(health.sleepMinutes)} />
            </View>
            <Text style={styles.healthSource}>{health.sources.length ? `Synced from ${health.sources.length} health ${health.sources.length === 1 ? 'app' : 'apps'}` : 'Connected through Android Health Connect'}</Text>
          </View>
        ) : (
          <View style={styles.connectPanel}>
            <View style={styles.connectIcon}><Ionicons name="heart-circle-outline" size={34} color={colors.accent} /></View>
            <View style={styles.connectCopy}>
              <Text style={styles.connectTitle}>{health.status === 'unavailable' ? 'Health Connect unavailable' : 'Connect your health apps'}</Text>
              <Text style={styles.connectDescription}>{health.error || 'Show steps, distance, calories, heart rate and sleep from compatible Android apps.'}</Text>
            </View>
            {health.status !== 'unavailable' && <Button title={connectingHealth ? 'Connecting...' : 'Connect'} onPress={handleConnectHealth} disabled={connectingHealth} style={styles.connectButton} />}
            {health.status === 'unavailable' && Platform.OS === 'android' && <Button title="Install / Update Health Connect" onPress={() => openHealthConnectStore().catch(() => undefined)} style={styles.connectButton} />}
          </View>
        )}

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

function formatSleep(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function HealthMetric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.healthMetric}>
      <Ionicons name={icon} size={19} color={colors.accent} />
      <Text style={styles.healthMetricValue}>{value}</Text>
      <Text style={styles.healthMetricLabel}>{label}</Text>
    </View>
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
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.s,
  },
  sectionEyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  healthTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  healthLoading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.l },
  healthPanel: { backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m, borderWidth: 1, borderColor: colors.border },
  stepsHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, paddingBottom: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepsIcon: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  stepsValue: { color: colors.textPrimary, fontSize: 27, fontWeight: '800', lineHeight: 30 },
  healthLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  connectedPill: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#143523', borderRadius: radius.full, paddingHorizontal: spacing.s, paddingVertical: 6 },
  connectedDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.success },
  connectedText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.s },
  healthMetric: { width: '50%', paddingVertical: spacing.s, gap: 3 },
  healthMetricValue: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  healthMetricLabel: { color: colors.textSecondary, fontSize: 11 },
  healthSource: { color: colors.textSecondary, fontSize: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.s, marginTop: spacing.xs },
  connectPanel: { backgroundColor: colors.surface, borderRadius: radius.l, borderWidth: 1, borderColor: colors.border, padding: spacing.m, alignItems: 'center' },
  connectIcon: { width: 58, height: 58, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s },
  connectCopy: { alignItems: 'center' },
  connectTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  connectDescription: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.xs },
  connectButton: { minWidth: 150, minHeight: 44 },
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
