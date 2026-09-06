import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { getMainExercises, type MainExerciseStat } from '../../../src/features/progress/reports';
import { colors, radius, spacing, typography } from '../../../src/theme';

function daysAgoISOString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function MainExercises() {
  const [exercises, setExercises] = useState<MainExerciseStat[]>([]);
  useEffect(() => { getMainExercises(daysAgoISOString(90)).then(setExercises); }, []);

  return (
    <Screen header={<HeaderBar left={<Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>} center={<Text style={typography.headerTitle}>Main Exercises</Text>} />}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.range}>MOST PERFORMED · LAST 90 DAYS</Text>
        {exercises.length === 0 ? (
          <View style={styles.empty}><Ionicons name="barbell-outline" size={32} color={colors.textSecondary} /><Text style={styles.emptyTitle}>No exercise history yet</Text><Text style={styles.muted}>Completed workout sets will appear here.</Text></View>
        ) : exercises.map((exercise, index) => (
          <Pressable key={exercise.id} style={styles.row} onPress={() => router.push(`/(member)/profile/exercises/${exercise.id}`)}>
            <Text style={styles.rank}>{index + 1}</Text>
            {exercise.imageUri ? <Image source={{ uri: exercise.imageUri }} style={styles.image} /> : <View style={styles.image}><Ionicons name="barbell-outline" size={20} color={colors.textSecondary} /></View>}
            <View style={styles.info}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.muted}>{exercise.setCount} completed sets</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  range: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: spacing.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, minHeight: 68, borderBottomWidth: 1, borderBottomColor: colors.border },
  rank: { width: 20, color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  image: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.s },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
});
