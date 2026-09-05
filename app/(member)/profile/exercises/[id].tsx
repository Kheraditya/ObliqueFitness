import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { getExercise } from '../../../../src/features/exercises/api';
import type { Exercise } from '../../../../src/features/exercises/types';
import { SummaryTab } from '../../../../src/features/exercises/components/SummaryTab';
import { HistoryTab } from '../../../../src/features/exercises/components/HistoryTab';
import { HowToTab } from '../../../../src/features/exercises/components/HowToTab';
import { LeaderboardTab } from '../../../../src/features/exercises/components/LeaderboardTab';
import { colors, spacing, typography } from '../../../../src/theme';

type TabKey = 'summary' | 'history' | 'howto' | 'leaderboard';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'history', label: 'History' },
  { key: 'howto', label: 'How to' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function ExerciseDetail() {
  const { id, pickMode: pickModeParam, callerReturnTo } = useLocalSearchParams<{
    id: string;
    pickMode?: string;
    // The list's own pickMode/returnTo, forwarded through so Back can restore them explicitly.
    // dismissTo below pops back to the exercise list's EXISTING screen instance rather than
    // pushing a new one (avoiding a duplicate screen), but React Navigation's POP_TO action
    // REPLACES that instance's route params with whatever this call supplies -- an empty/bare
    // dismissTo would silently wipe pickMode/returnTo off the list and break the "Add Exercise"
    // pick flow entirely (the row press would stop returning to the original caller). Local UI
    // state on the list (search text, equipment/muscle filter) is plain component state, not
    // route params, so it isn't affected either way -- the list screen itself never unmounts.
    callerReturnTo?: string;
  }>();
  const pickMode = pickModeParam === 'true';
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const navigation = useNavigation();

  function handleBack() {
    const backParams: Record<string, string> = {};
    if (pickModeParam) backParams.pickMode = pickModeParam;
    if (callerReturnTo) backParams.returnTo = callerReturnTo;
    router.dismissTo({ pathname: '/(member)/profile/exercises', params: backParams });
  }

  useEffect(() => {
    if (id) getExercise(id).then(setExercise);
  }, [id]);

  useEffect(() => {
    // The swipe-back gesture bypasses handleBack entirely and triggers the same unreliable
    // native pop described above, so it's disabled specifically for the cross-tab pick-mode
    // case -- normal same-tab browsing (Profile > Exercises > this screen) keeps swipe-back,
    // since that pop is a simple, reliable one level within the same stack.
    navigation.setOptions({ gestureEnabled: !pickMode });
  }, [navigation, pickMode]);

  const header = (
    <HeaderBar
      left={
        <Pressable onPress={handleBack} hitSlop={8} testID="back-button">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
      }
    />
  );

  if (!exercise) {
    return (
      <Screen header={header}>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen header={header}>
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
      <ScrollView>
        {activeTab === 'summary' && <SummaryTab exercise={exercise} />}
        {activeTab === 'history' && <HistoryTab exerciseId={exercise.id} />}
        {activeTab === 'howto' && <HowToTab exercise={exercise} />}
        {activeTab === 'leaderboard' && <LeaderboardTab exerciseId={exercise.id} />}
      </ScrollView>
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
