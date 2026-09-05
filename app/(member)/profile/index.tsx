import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut, getCurrentUserProfile } from '../../../src/features/auth/api';
import { getWorkoutSummary } from '../../../src/features/workout/api';
import type { RecentSession } from '../../../src/features/workout/api';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { DashboardTile } from '../../../src/components/DashboardTile';
import { PillTabs } from '../../../src/components/PillTabs';
import { ListItem } from '../../../src/components/ListItem';
import { colors, radius, spacing, typography } from '../../../src/theme';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default function ProfileHome() {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  // Presentational only for now -- no per-metric chart data is computed yet, matching the
  // same accepted trade-off already used on the routine detail screen.
  const [metric, setMetric] = useState('duration');

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      setName(profile?.name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
    });
    getWorkoutSummary().then((summary) => {
      setWorkoutCount(summary.count);
      setRecentSessions(summary.recent);
    });
  }, []);

  return (
    <Screen>
      <ScrollView>
        <View style={styles.header}>
          <Text style={typography.title}>{name ?? 'Member'}</Text>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => {}} style={styles.headerIconButton}>
              <Ionicons name="pencil" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable onPress={() => {}} style={styles.headerIconButton}>
              <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable onPress={() => {}} style={styles.headerIconButton}>
              <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.profileRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={32} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.statsRow}>
            <StatColumn label="Workouts" value={String(workoutCount)} />
            <StatColumn label="Followers" value="0" />
            <StatColumn label="Following" value="0" />
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={typography.subtitle}>No data yet.</Text>
        </View>
        <PillTabs
          options={[
            { key: 'duration', label: 'Duration' },
            { key: 'volume', label: 'Volume' },
            { key: 'reps', label: 'Reps' },
          ]}
          value={metric}
          onChange={setMetric}
        />

        <Text style={[typography.title, styles.sectionHeading]}>Dashboard</Text>
        <View style={styles.grid}>
          <View style={styles.tileRow}>
            <DashboardTile
              label="Statistics"
              icon="stats-chart-outline"
              onPress={() => router.push('/(member)/profile/statistics')}
            />
            <DashboardTile
              label="Exercises"
              icon="barbell-outline"
              onPress={() => router.push('/(member)/profile/exercises')}
            />
          </View>
          <View style={styles.tileRow}>
            <DashboardTile
              label="Measures"
              icon="body-outline"
              onPress={() => router.push('/(member)/profile/measures')}
            />
            <DashboardTile label="Calendar" icon="calendar-outline" onPress={() => {}} disabled />
          </View>
        </View>

        <Text style={[typography.title, styles.sectionHeading]}>Workouts</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={28} color={colors.textSecondary} />
            <Text style={[typography.subtitle, styles.emptyText]}>No workouts</Text>
            <Pressable onPress={() => router.push('/(member)/workout')}>
              <Text style={styles.startLink}>Start tracking here</Text>
            </Pressable>
          </View>
        ) : (
          recentSessions.map((session) => (
            <ListItem
              key={session.id}
              title={session.startedAt.slice(0, 10)}
              trailing={formatDuration(session.durationSeconds)}
            />
          ))
        )}

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        />
      </ScrollView>
    </Screen>
  );
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statColumn}>
      <Text style={typography.body}>{value}</Text>
      <Text style={typography.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  headerIconButton: {
    padding: spacing.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.l,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  statColumn: {
    alignItems: 'center',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  grid: {
    gap: spacing.s,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  emptyText: {
    marginTop: spacing.xs,
  },
  startLink: {
    color: colors.accent,
    fontWeight: '600',
  },
});
