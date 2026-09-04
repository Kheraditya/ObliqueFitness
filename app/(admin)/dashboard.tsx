import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../src/features/auth/api';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { typography, spacing } from '../../src/theme';

export default function AdminDashboard() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Welcome, admin</Text>
      <Button title="Sign Out" onPress={async () => { await signOut(); router.replace('/'); }} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.l,
  },
});
