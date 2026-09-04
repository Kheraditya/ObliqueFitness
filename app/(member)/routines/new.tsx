import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { Button } from '../../../src/components/Button';
import { ErrorText } from '../../../src/components/ErrorText';
import { RoutineExerciseList } from '../../../src/features/routines/components/RoutineExerciseList';
import { createRoutine } from '../../../src/features/routines/api';
import { getExercise } from '../../../src/features/exercises/api';
import type { RoutineExerciseDraft } from '../../../src/features/routines/types';

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

  return (
    <Screen>
      <TextField label="Name" placeholder="Routine name" value={name} onChangeText={setName} />
      <Button
        title="Add Exercise"
        variant="secondary"
        onPress={() => router.push({ pathname: '/(member)/profile/exercises', params: { pickMode: 'true', returnTo: '/(member)/routines/new' } })}
      />
      <RoutineExerciseList exercises={exercises} onChange={setExercises} />
      {error && <ErrorText>{error}</ErrorText>}
      <Button title="Save" onPress={handleSave} />
    </Screen>
  );
}
