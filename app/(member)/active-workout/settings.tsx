import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
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
    <Screen>
      <View style={styles.header}>
        <Pressable testID="back-button" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.body}>Workout Settings</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
      <ScrollView>
        <NavRow title="Sounds" />
        <NavRow title="Default Rest Timer" value="Off" />
        <NavRow title="Previous Workout Values" value="Default" />
        <NavRow title="Warm-up Calculator" />
        <NavRow title="Warm-up Sets" />

        <ToggleRow
          title="Keep Awake During Workout"
          description="Enable this if you don't want your phone to sleep while you're in a workout"
          value={settings.keepAwake}
          onValueChange={(v) => toggle('keepAwake', v)}
        />
        <ToggleRow
          title="Plate Calculator"
          description="A plate calculator calculates the plates needed on a bar to achieve a specific weight."
          value={settings.plateCalculator}
          onValueChange={(v) => toggle('plateCalculator', v)}
        />
        <ToggleRow
          title="RPE Tracking"
          description="RPE (Rated Perceived Exertion) is a measure of the intensity of an exercise. Enabling RPE tracking will allow you to log it for each set in your workouts."
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
        />
      </ScrollView>
    </Screen>
  );
}

function NavRow({ title, value }: { title: string; value?: string }) {
  return (
    <View style={styles.navRow}>
      <Text style={typography.body}>{title}</Text>
      <View style={styles.navRowRight}>
        {value && <Text style={styles.navRowValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleRowHeader}>
        <Text style={typography.body}>{title}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
          thumbColor={colors.textPrimary}
        />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
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
  doneText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  navRowValue: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  toggleRow: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
