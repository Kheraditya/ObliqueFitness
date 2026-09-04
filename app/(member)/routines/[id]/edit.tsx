import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { TextField } from '../../../../src/components/TextField';
import { Button } from '../../../../src/components/Button';
import { RoutineExerciseList } from '../../../../src/features/routines/components/RoutineExerciseList';
import { getRoutine, updateRoutine, deleteRoutine } from '../../../../src/features/routines/api';
import { getExercise } from '../../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../../src/features/routines/types';

export default function EditRoutine() {
  const { id, addExerciseId } = useLocalSearchParams<{ id: string; addExerciseId?: string }>();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);

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
    });
  }, [id]);

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
    const { error } = await updateRoutine(id, name, exercises);
    if (!error) router.replace(`/(member)/routines/${id}`);
  }

  async function handleDelete() {
    const { error } = await deleteRoutine(id);
    if (!error) router.replace('/(member)/workout');
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
      <Button title="Save" onPress={handleSave} />
      <Button title="Delete Routine" variant="secondary" onPress={handleDelete} />
    </Screen>
  );
}
