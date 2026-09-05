import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { HeaderBar } from '../../../src/components/HeaderBar';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { RoutineExerciseList } from '../../../src/features/routines/components/RoutineExerciseList';
import { createRoutine } from '../../../src/features/routines/api';
import { getExercise } from '../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../src/features/routines/types';
import { colors, radius, spacing, typography } from '../../../src/theme';

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

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
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
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          }
          center={<Text style={typography.headerTitle}>Create Routine</Text>}
          right={
            <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8} style={[styles.savePill, canSave && styles.savePillActive]}>
              <Text style={[styles.saveText, canSave && styles.saveTextActive]}>Save</Text>
            </Pressable>
          }
        />
      }
    >
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
          <Ionicons name="barbell-outline" size={52} color={colors.textSecondary} />
          <Text style={styles.emptySubtitle}>Get started by adding an exercise to your routine.</Text>
          <Button title="Add exercise" icon="add" onPress={handleAddExercise} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <RoutineExerciseList exercises={exercises} onChange={setExercises} />
          <Button title="Add Exercise" variant="secondary" onPress={handleAddExercise} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '400',
  },
  savePill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.surfaceElevated,
  },
  savePillActive: {
    backgroundColor: colors.accent,
  },
  saveText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveTextActive: {
    color: colors.textPrimary,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: spacing.m,
    marginTop: spacing.l,
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
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.l,
  },
});
