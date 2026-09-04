import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { getExercise } from '../../../../src/features/exercises/api';
import type { Exercise } from '../../../../src/features/exercises/types';
import { SummaryTab } from '../../../../src/features/exercises/components/SummaryTab';
import { colors, spacing, typography } from '../../../../src/theme';

type TabKey = 'summary' | 'history' | 'howto' | 'leaderboard';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'history', label: 'History' },
  { key: 'howto', label: 'How to' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  useEffect(() => {
    if (id) getExercise(id).then(setExercise);
  }, [id]);

  if (!exercise) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>{exercise.name}</Text>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabelInactive}>{tab.label}</Text>
              {isActive && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>
      <ScrollView>{activeTab === 'summary' && <SummaryTab exercise={exercise} />}</ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    marginRight: spacing.l,
    paddingBottom: spacing.s,
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 15,
  },
  tabUnderline: {
    height: 2,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
    borderRadius: 1,
  },
});
