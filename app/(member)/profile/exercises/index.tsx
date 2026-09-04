import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { listExercises } from '../../../../src/features/exercises/api';
import { filterExercises } from '../../../../src/features/exercises/filters';
import type { Exercise } from '../../../../src/features/exercises/types';
import { typography, spacing, colors } from '../../../../src/theme';

export default function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const { pickMode, returnTo } = useLocalSearchParams<{ pickMode?: string; returnTo?: string }>();

  useEffect(() => {
    listExercises().then(setExercises);
  }, []);

  const filtered = filterExercises(exercises, { search, equipment: null, muscle: null });

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Exercises</Text>
      <TextField label="Search" placeholder="Search exercises" value={search} onChangeText={setSearch} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (pickMode === 'true' && returnTo) {
                router.push({ pathname: returnTo, params: { addExerciseId: item.id } });
              } else {
                router.push(`/(member)/profile/exercises/${item.id}`);
              }
            }}
          >
            <Text style={typography.body}>{item.name}</Text>
            <Text style={typography.label}>{item.primary_muscles.join(', ')}</Text>
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
  row: {
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
