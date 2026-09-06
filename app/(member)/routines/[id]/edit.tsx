import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { HeaderBar } from '../../../../src/components/HeaderBar';
import { Button } from '../../../../src/components/Button';
import { ErrorText } from '../../../../src/components/ErrorText';
import { RoutineExerciseList } from '../../../../src/features/routines/components/RoutineExerciseList';
import { getRoutine, updateRoutine, deleteRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../../src/features/routines/types';
import { colors, radius, spacing, typography } from '../../../../src/theme';

export default function EditRoutine() {
  const { id, addExerciseId } = useLocalSearchParams<{ id: string; addExerciseId?: string }>();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getRoutine(id).then((routine) => {
      if (!routine) return;
      setName(routine.name);
      setExercises(
        routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          ...(ex.imageUri ? { imageUri: ex.imageUri } : {}),
          notes: ex.notes ?? '',
          targetSets: ex.targetSets,
          restSeconds: ex.restSeconds,
          supersetGroup: ex.supersetGroup,
        }))
      );
      setLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (!addExerciseId || !loaded) return;
    getExercise(addExerciseId).then((exercise) => {
      if (!exercise) return;
      setExercises((prev) => [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          ...(exercise.images?.[0] ? { imageUri: exercise.images[0] } : {}),
          notes: '',
          targetSets: 1,
          restSeconds: 0,
          supersetGroup: null,
        },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId, loaded]);

  async function handleSave() {
    if (!loaded || !name.trim()) return;
    const { error: saveError } = await updateRoutine(id, name, exercises);
    if (saveError) {
      setError(saveError);
      return;
    }
    router.replace(`/(member)/routines/${id}`);
  }

  async function handleDelete() {
    const { error: deleteError } = await deleteRoutine(id);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    router.replace('/(member)/workout');
  }

  if (!loaded) {
    return (
      <Screen>
        <Text style={typography.body}>Loading...</Text>
      </Screen>
    );
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
          center={<Text style={typography.headerTitle}>Edit Routine</Text>}
          right={
            <Pressable
              onPress={handleSave}
              disabled={!name.trim()}
              hitSlop={8}
              style={[styles.savePill, !!name.trim() && styles.savePillActive]}
            >
              <Text style={[styles.saveText, !!name.trim() && styles.saveTextActive]}>Save</Text>
            </Pressable>
          }
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Routine title"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <RoutineExerciseList exercises={exercises} onChange={setExercises} />
        {error && <ErrorText>{error}</ErrorText>}
        <Button
          title="Add exercise"
          icon="add"
          onPress={() =>
            router.push({
              pathname: '/(member)/profile/exercises',
              params: { pickMode: 'true', returnTo: `/(member)/routines/${id}/edit` },
            })
          }
          style={styles.addExerciseButton}
        />
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Routine options</Text>
          <Button
            title="Delete Routine"
            variant="dark"
            textColor={colors.danger}
            onPress={handleDelete}
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelText: {
    color: colors.accent,
    fontSize: 16,
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
    fontWeight: '700',
  },
  saveTextActive: {
    color: colors.textPrimary,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.l,
    marginTop: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addExerciseButton: {
    marginTop: spacing.l,
    minHeight: 52,
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dangerTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deleteButton: {
    marginBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
