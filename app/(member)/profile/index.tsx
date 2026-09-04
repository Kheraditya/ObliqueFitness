import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../../src/features/auth/api';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { typography, spacing } from '../../../src/theme';

export default function ProfileHome() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Profile</Text>
      <View style={styles.grid}>
        <Button title="Exercises" variant="secondary" onPress={() => router.push('/(member)/profile/exercises')} />
        <Button title="Statistics" variant="secondary" disabled onPress={() => {}} />
        <Button title="Measures" variant="secondary" disabled onPress={() => {}} />
        <Button title="Calendar" variant="secondary" disabled onPress={() => {}} />
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
  },
});
