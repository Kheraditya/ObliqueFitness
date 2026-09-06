import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { signOut } from '../../../src/features/auth/api';
import { getLeaderboardOptIn, setLeaderboardOptIn } from '../../../src/features/exercises/api';
import { openHealthAppsSettings } from '../../../src/features/health/api';
import { colors, radius, spacing, typography } from '../../../src/theme';

export default function ProfileSettings() {
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { getLeaderboardOptIn().then(setLeaderboardEnabled); }, []);

  async function toggleLeaderboard(value: boolean) {
    setLeaderboardEnabled(value);
    const result = await setLeaderboardOptIn(value);
    if (result.error) {
      setLeaderboardEnabled(!value);
      setMessage(result.error);
    } else {
      setMessage(null);
    }
  }

  async function handleHealthSettings() {
    try {
      await openHealthAppsSettings();
      setMessage(null);
    } catch {
      setMessage('Health Connect is unavailable. Connect it from the Home screen first.');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  return (
    <Screen header={<HeaderBar left={<Pressable onPress={() => router.back()} testID="back-button"><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></Pressable>} center={<Text style={typography.headerTitle}>Settings</Text>} />}>
      <ScrollView contentContainerStyle={styles.content}>
        {message && <Text style={styles.error}>{message}</Text>}

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.panel}>
          <SettingsRow title="Edit profile" subtitle="Name, photo and personal details" icon="person-outline" onPress={() => router.push('/(member)/profile/edit')} />
        </View>

        <Text style={styles.sectionLabel}>TRAINING</Text>
        <View style={styles.panel}>
          <SettingsRow title="Workout settings" subtitle="Timers, RPE, plates and workout behavior" icon="barbell-outline" onPress={() => router.push('/(member)/active-workout/settings')} />
        </View>

        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            <View style={styles.icon}><Ionicons name="trophy-outline" size={20} color={colors.accent} /></View>
            <View style={styles.copy}><Text style={styles.title}>Gym leaderboards</Text><Text style={styles.subtitle}>Allow your name and eligible lifts to appear in your gym.</Text></View>
            <Switch testID="leaderboard-switch" accessibilityLabel="Show me on gym leaderboards" value={leaderboardEnabled} onValueChange={toggleLeaderboard} trackColor={{ false: colors.surfaceElevated, true: colors.accent }} thumbColor={colors.textPrimary} />
          </View>
        </View>

        {Platform.OS === 'android' && (
          <>
            <Text style={styles.sectionLabel}>CONNECTED APPS</Text>
            <View style={styles.panel}>
              <SettingsRow title="Health Connect" subtitle="Manage steps, sleep, heart rate and activity access" icon="heart-outline" onPress={handleHealthSettings} />
            </View>
          </>
        )}

        <Pressable style={styles.signOut} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.icon}><Ionicons name={icon} size={20} color={colors.accent} /></View>
      <View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.l, paddingBottom: spacing.xl },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.l, marginBottom: spacing.s },
  panel: { backgroundColor: colors.surface, borderRadius: radius.l, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.m },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  toggleRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  icon: { width: 38, height: 38, borderRadius: radius.m, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  signOut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, borderRadius: radius.m, backgroundColor: colors.surface, marginTop: spacing.xl },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, backgroundColor: colors.surface, borderRadius: radius.m, padding: spacing.m },
  pressed: { opacity: 0.7 },
});
