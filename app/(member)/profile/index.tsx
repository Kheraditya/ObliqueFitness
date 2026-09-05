import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../../src/features/auth/api';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { DashboardTile } from '../../../src/components/DashboardTile';
import { typography, spacing } from '../../../src/theme';

export default function ProfileHome() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Profile</Text>
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
      <Button
        title="Sign Out"
        variant="secondary"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
  grid: {
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
});
