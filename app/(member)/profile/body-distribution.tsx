import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { MuscleHeatmap } from '../../../src/features/progress/components/MuscleHeatmap';
import { getSetsCountByMuscle } from '../../../src/features/progress/reports';
import { MUSCLE_TO_ZONE } from '../../../src/features/progress/muscleZones';
import { colors, spacing, typography } from '../../../src/theme';

const ALL_MUSCLES = Object.keys(MUSCLE_TO_ZONE).sort();

function daysAgoISOString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function BodyDistribution() {
  const [bySpecific, setBySpecific] = useState<{ muscle: string; sets: number }[]>([]);

  useEffect(() => {
    getSetsCountByMuscle(daysAgoISOString(7), new Date().toISOString()).then(setBySpecific);
  }, []);

  const totalSets = bySpecific.reduce((sum, m) => sum + m.sets, 0);
  const setsByName = new Map(bySpecific.map((m) => [m.muscle, m.sets]));

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Body distribution</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView>
        <Text style={styles.rangeLabel}>Last 7 days</Text>
        <MuscleHeatmap muscleVolumes={bySpecific.map((m) => ({ muscle: m.muscle, volume: m.sets }))} />

        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderText}>Muscle</Text>
          <Text style={styles.tableHeaderText}>Sets</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[typography.body, styles.totalLabel]}>Total</Text>
          <Text style={typography.body}>{totalSets}</Text>
        </View>
        {ALL_MUSCLES.map((muscle) => (
          <View key={muscle} style={styles.tableRow}>
            <Text style={typography.body}>{muscle.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
            <Text style={typography.body}>{setsByName.get(muscle) ?? 0}</Text>
          </View>
        ))}
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
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  tableHeaderText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalLabel: {
    fontWeight: '700',
  },
});
