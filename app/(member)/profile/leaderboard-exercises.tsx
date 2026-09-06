import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { getLoggedExercises } from '../../../src/features/exercises/api';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function LeaderboardExercises() {
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { getLoggedExercises().then(setExercises); }, []);

  return (
    <Screen header={<HeaderBar left={<Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>} center={<Text style={typography.headerTitle}>Leaderboards</Text>} />}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}><Ionicons name="trophy-outline" size={24} color={colors.accent} /><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Exercise leaderboards</Text><Text style={styles.muted}>Choose a logged exercise to see rankings within your gym.</Text></View></View>
        {exercises.length === 0 ? <Text style={styles.empty}>Log an exercise to unlock its leaderboard.</Text> : exercises.map((exercise) => (
          <Pressable key={exercise.id} style={styles.row} onPress={() => router.push({ pathname: `/(member)/profile/exercises/${exercise.id}`, params: { initialTab: 'leaderboard' } })}>
            <View style={styles.icon}><Ionicons name="barbell-outline" size={19} color={colors.accent} /></View>
            <Text style={styles.name}>{exercise.name}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  notice: { flexDirection: 'row', gap: spacing.m, backgroundColor: colors.surface, borderRadius: radius.l, padding: spacing.m, borderWidth: 1, borderColor: colors.border },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  muted: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: radius.m, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 80 },
});
