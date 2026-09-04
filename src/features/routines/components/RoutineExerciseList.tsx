import { Text, View, StyleSheet } from 'react-native';
import type { RoutineExerciseDraft } from '../types';
import { moveUp, moveDown, groupWithPrevious, ungroup } from '../reorder';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface RoutineExerciseListProps {
  exercises: RoutineExerciseDraft[];
  onChange: (exercises: RoutineExerciseDraft[]) => void;
}

export function RoutineExerciseList({ exercises, onChange }: RoutineExerciseListProps) {
  function updateAt(index: number, patch: Partial<RoutineExerciseDraft>) {
    const next = [...exercises];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(exercises.filter((_, i) => i !== index));
  }

  return (
    <View>
      {exercises.map((ex, index) => (
        <View key={`${ex.exerciseId}-${index}`} style={styles.row}>
          <Text style={typography.body}>{ex.exerciseName}</Text>
          {ex.supersetGroup != null && <Text style={typography.label}>Superset {ex.supersetGroup}</Text>}
          <View style={styles.controlRow}>
            <Text style={typography.label}>Sets: {ex.targetSets}</Text>
            <Button title="-" variant="secondary" onPress={() => updateAt(index, { targetSets: Math.max(1, ex.targetSets - 1) })} />
            <Button title="+" variant="secondary" onPress={() => updateAt(index, { targetSets: ex.targetSets + 1 })} />
          </View>
          <View style={styles.controlRow}>
            <Text style={typography.label}>Rest: {ex.restSeconds}s</Text>
            <Button title="-" variant="secondary" onPress={() => updateAt(index, { restSeconds: Math.max(0, ex.restSeconds - 15) })} />
            <Button title="+" variant="secondary" onPress={() => updateAt(index, { restSeconds: ex.restSeconds + 15 })} />
          </View>
          <View style={styles.controlRow}>
            <Button title="Up" variant="secondary" onPress={() => onChange(moveUp(exercises, index))} />
            <Button title="Down" variant="secondary" onPress={() => onChange(moveDown(exercises, index))} />
            <Button
              title={ex.supersetGroup != null ? 'Ungroup' : 'Group with above'}
              variant="secondary"
              onPress={() => onChange(ex.supersetGroup != null ? ungroup(exercises, index) : groupWithPrevious(exercises, index))}
            />
            <Button title="Remove" variant="secondary" onPress={() => removeAt(index)} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
  },
});
