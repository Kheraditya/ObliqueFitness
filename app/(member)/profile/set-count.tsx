import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { getSetsCountByMuscle } from '../../../src/features/progress/reports';
import { groupCounts, MUSCLE_GROUPS } from '../../../src/features/progress/muscleGroups';
import { colors, radius, spacing, typography } from '../../../src/theme';

function daysAgoISOString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function SetCountStatistics() {
  const [sets, setSets] = useState<{ muscle: string; sets: number }[]>([]);

  useEffect(() => {
    getSetsCountByMuscle(daysAgoISOString(30), new Date().toISOString()).then(setSets);
  }, []);

  const grouped = groupCounts(sets);
  const max = Math.max(1, ...Object.values(grouped));
  const total = sets.reduce((sum, item) => sum + item.sets, 0);

  return (
    <Screen header={<HeaderBar left={<Pressable onPress={() => router.back()} testID="back-button"><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>} center={<Text style={typography.headerTitle}>Set Count</Text>} />}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.range}>LAST 30 DAYS</Text>
        <View style={styles.totalCard}><Text style={styles.totalValue}>{total}</Text><Text style={styles.totalLabel}>total muscle-set entries</Text></View>
        <Text style={styles.heading}>Muscle groups</Text>
        <View style={styles.panel}>
          {MUSCLE_GROUPS.map((group) => (
            <View key={group} style={styles.barRow}>
              <View style={styles.barHeader}><Text style={styles.groupName}>{group}</Text><Text style={styles.groupValue}>{grouped[group]} sets</Text></View>
              <View style={styles.track}><View style={[styles.fill, { width: `${(grouped[group] / max) * 100}%` }]} /></View>
            </View>
          ))}
        </View>
        <Text style={styles.heading}>Specific muscles</Text>
        {sets.length === 0 ? <Text style={styles.empty}>Complete a workout to see set distribution.</Text> : sets.slice().sort((a, b) => b.sets - a.sets).map((item) => (
          <View key={item.muscle} style={styles.muscleRow}><Text style={styles.muscleName}>{item.muscle.replace(/\b\w/g, (letter) => letter.toUpperCase())}</Text><Text style={styles.groupValue}>{item.sets}</Text></View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  range: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  totalCard: { backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.l, marginTop: spacing.s, borderWidth: 1, borderColor: colors.border },
  totalValue: { color: colors.textPrimary, fontSize: 32, fontWeight: '800' },
  totalLabel: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs },
  heading: { color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.s },
  panel: { backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m },
  barRow: { marginBottom: spacing.m },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  groupName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  groupValue: { color: colors.textSecondary, fontSize: 13 },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  fill: { height: 8, backgroundColor: colors.accent, borderRadius: radius.full },
  muscleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  muscleName: { color: colors.textPrimary, fontSize: 15 },
  empty: { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },
});
