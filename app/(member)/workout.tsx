import { Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { typography, spacing } from '../../src/theme';

export default function Workout() {
  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Workout</Text>
      <Button title="Start Empty Workout" onPress={() => {}} disabled />
      <Text style={[typography.subtitle, styles.note]}>Routines are coming soon.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  note: {
    marginTop: spacing.l,
  },
});
