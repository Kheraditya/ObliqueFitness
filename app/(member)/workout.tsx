import { useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { DashboardTile } from '../../src/components/DashboardTile';
import { ListItem } from '../../src/components/ListItem';
import { listRoutines } from '../../src/features/routines/api';
import { startSession } from '../../src/features/workout/api';
import { typography, spacing } from '../../src/theme';

export default function Workout() {
  const [routines, setRoutines] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRoutines().then(setRoutines);
  }, []);

  async function handleStartEmpty() {
    const { id, error: startError } = await startSession(null);
    if (id) {
      router.push(`/(member)/active-workout/${id}`);
      return;
    }
    setError(startError);
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Workout</Text>
      <Button title="Start Empty Workout" onPress={handleStartEmpty} variant="dark" icon="add" align="left" />
      {error && <ErrorText>{error}</ErrorText>}
      <Text style={[typography.title, styles.sectionHeading]}>Routines</Text>
      <View style={styles.tileRow}>
        <DashboardTile label="New Routine" icon="clipboard-outline" onPress={() => router.push('/(member)/routines/new')} />
        <DashboardTile label="Explore" icon="search-outline" onPress={() => {}} disabled />
      </View>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListItem title={item.name} trailing="chevron" onPress={() => router.push(`/(member)/routines/${item.id}`)} />
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
  tileRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
});
