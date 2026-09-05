import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { getWorkoutSettings, updateWorkoutSetting, DEFAULT_WORKOUT_SETTINGS } from '../../../src/features/workout/settings';
import type { WorkoutSettings } from '../../../src/features/workout/settings';
import { colors, spacing, typography } from '../../../src/theme';

export default function WorkoutSettingsScreen() {
  const [settings, setSettings] = useState<WorkoutSettings>(DEFAULT_WORKOUT_SETTINGS);

  useEffect(() => {
    getWorkoutSettings().then(setSettings);
  }, []);

  async function toggle<K extends keyof WorkoutSettings>(key: K, value: WorkoutSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await updateWorkoutSetting(key, value);
  }

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable testID="back-button" onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Workout Settings</Text>}
          right={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          }
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <NavRow title="Sounds" />
          <NavRow title="Default Rest Timer" value="Off" />
          <NavRow title="Previous Workout Values" value="Default" />
          <NavRow title="Warm-up Calculator" />
          <NavRow title="Warm-up Sets" last />
        </View>

        <View style={styles.section}>
          <ToggleRow
            title="Keep Awake During Workout"
            description="Enable this if you don't want your phone to sleep while you're in a workout"
            value={settings.keepAwake}
            onValueChange={(v) => toggle('keepAwake', v)}
          />
          <ToggleRow
            title="Plate Calculator"
            description="A plate calculator calculates the plates needed on a bar to achieve a specific weight. When enabled, a Calculator button will appear when inputting weight for barbell exercises."
            value={settings.plateCalculator}
            onValueChange={(v) => toggle('plateCalculator', v)}
          />
          <ToggleRow
            title="RPE Tracking"
            description="RPE (Rated Perceived Exertion) is a measure of the intensity an exercise. Enabling RPE tracking will allow you to log it for each set in your workouts."
            value={settings.rpeTracking}
            onValueChange={(v) => toggle('rpeTracking', v)}
          />
          <ToggleRow
            title="Smart Superset Scrolling"
            description="When you complete a set, it'll automatically scroll to the next exercise in the superset."
            value={settings.smartSupersetScrolling}
            onValueChange={(v) => toggle('smartSupersetScrolling', v)}
          />
          <ToggleRow
            title="Inline Timer"
            description="Duration exercises have a built-in stopwatch for tracking time for each set."
            value={settings.inlineTimer}
            onValueChange={(v) => toggle('inlineTimer', v)}
          />
          <ToggleRow
            title="Live Personal Record Notification"
            description="When enabled, it'll notify you when you achieve a Personal Record upon checking the set."
            value={settings.livePrNotification}
            onValueChange={(v) => toggle('livePrNotification', v)}
            last
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function NavRow({ title, value, last = false }: { title: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.rowBleed, last && styles.rowNoBorder]}>
      <View style={styles.navRow}>
        <Text style={styles.rowTitle}>{title}</Text>
        <View style={styles.navRowRight}>
          {value && <Text style={styles.navRowValue}>{value}</Text>}
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  last = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.rowBleed, last && styles.rowNoBorder]}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleRowHeader}>
          <Text style={[styles.rowTitle, styles.toggleTitle]}>{title}</Text>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  doneText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.l,
  },
  // Full-bleed divider trick: cancel the Screen body's horizontal padding with a matching
  // negative margin so the border spans edge to edge, then reapply padding for the row content.
  rowBleed: {
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 17,
    color: colors.textPrimary,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  navRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  navRowValue: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  toggleRow: {
    paddingVertical: spacing.m,
  },
  toggleRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    flex: 1,
    marginRight: spacing.m,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.s,
  },
});
