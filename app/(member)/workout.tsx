import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { listRoutines } from '../../src/features/routines/api';
import { typography, spacing, colors } from '../../src/theme';

export default function Workout() {
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    listRoutines().then(setRoutines);
  }, []);

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Workout</Text>
      <Button title="Start Empty Workout" onPress={() => {}} disabled />
      <Text style={[typography.title, styles.sectionHeading]}>Routines</Text>
      <Button title="New Routine" variant="secondary" onPress={() => router.push('/(member)/routines/new')} />
      <Button title="Explore" variant="secondary" onPress={() => {}} disabled />
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(member)/routines/${item.id}`)}>
            <Text style={typography.body}>{item.name}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  sectionHeading: {
    fontSize: 20,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
