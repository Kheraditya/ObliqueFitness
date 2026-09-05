import { useEffect, useState } from 'react';
import { FlatList, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { ListItem } from '../../../../src/components/ListItem';
import { listExercises } from '../../../../src/features/exercises/api';
import { filterExercises } from '../../../../src/features/exercises/filters';
import type { Exercise } from '../../../../src/features/exercises/types';
import { typography, spacing } from '../../../../src/theme';

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
          <ListItem
            title={item.name}
            subtitle={item.primary_muscles[0] ?? ''}
            imageUri={item.images[0]}
            trailing="chevron"
            onPress={() => {
              if (pickMode === 'true' && returnTo) {
                router.push({ pathname: returnTo, params: { addExerciseId: item.id } });
              } else {
                router.push(`/(member)/profile/exercises/${item.id}`);
              }
            }}
          />
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
});
