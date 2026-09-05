import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { RoutineExerciseList } from '../../../src/features/routines/components/RoutineExerciseList';
import { createRoutine } from '../../../src/features/routines/api';
import { getExercise } from '../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../src/features/routines/types';
import { colors, spacing, typography } from '../../../src/theme';

export default function NewRoutine() {
  const { addExerciseId } = useLocalSearchParams<{ addExerciseId?: string }>();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addExerciseId) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => [
        ...prev,
        { exerciseId: exercise.id, exerciseName: exercise.name, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId]);

  async function handleSave() {
    const result = await createRoutine(name, exercises);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.id) router.replace(`/(member)/routines/${result.id}`);
  }

  function handleAddExercise() {
    router.push({ pathname: '/(member)/profile/exercises', params: { pickMode: 'true', returnTo: '/(member)/routines/new' } });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerAction}>Cancel</Text>
        </Pressable>
        <Text style={typography.body}>Create Routine</Text>
        <Pressable onPress={handleSave}>
          <Text style={styles.headerAction}>Save</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.titleInput}
        placeholder="Routine title"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      {error && <ErrorText>{error}</ErrorText>}

      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptySubtitle}>Get started by adding an exercise to your routine.</Text>
          <Button title="Add exercise" icon="add" onPress={handleAddExercise} />
        </View>
      ) : (
        <ScrollView>
          <RoutineExerciseList exercises={exercises} onChange={setExercises} />
          <Button title="Add Exercise" variant="secondary" onPress={handleAddExercise} />
        </ScrollView>
      )}
    </Screen>
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
  headerAction: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.m,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.l,
  },
});
