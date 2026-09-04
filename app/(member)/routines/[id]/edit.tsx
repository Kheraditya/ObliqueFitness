import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { Button } from '../../../../src/components/Button';
import { ErrorText } from '../../../../src/components/ErrorText';
import { RoutineExerciseList } from '../../../../src/features/routines/components/RoutineExerciseList';
import { getRoutine, updateRoutine, deleteRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../../src/features/routines/types';
import { typography } from '../../../../src/theme';

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
        { exerciseId: exercise.id, exerciseName: exercise.name, targetSets: 3, restSeconds: 90, supersetGroup: null },
      ]);
      router.setParams({ addExerciseId: undefined });
    });
  }, [addExerciseId, loaded]);

  async function handleSave() {
    if (!loaded) return;
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
    <Screen>
      <TextField label="Name" placeholder="Routine name" value={name} onChangeText={setName} />
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/(member)/profile/exercises', params: { pickMode: 'true', returnTo: `/(member)/routines/${id}/edit` } })
        }
      />
      <RoutineExerciseList exercises={exercises} onChange={setExercises} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Save" onPress={handleSave} />
      <Button title="Delete Routine" variant="secondary" onPress={handleDelete} />
    </Screen>
  );
}
