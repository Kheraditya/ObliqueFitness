import { useState } from 'react';
import { Text, TextInput, View, StyleSheet, Pressable } from 'react-native';
import type { SessionExercise, LoggedSet } from '../types';
import { Button } from '../../../components/Button';
import { colors, radius, spacing, typography } from '../../../theme';

interface SessionExerciseCardProps {
  exercise: SessionExercise;
  sets: LoggedSet[];
  onLogSet: (weight: number | null, reps: number | null, rpe: number | null) => void;
  onUpdateSet: (setId: string, weight: number | null, reps: number | null, rpe: number | null) => void;
}

function parseNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function SessionExerciseCard({ exercise, sets, onLogSet, onUpdateSet }: SessionExerciseCardProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  function handleConfirm() {
    const w = parseNum(weight);
    const r = parseNum(reps);
    const p = parseNum(rpe);
    if (editingSetId) {
      onUpdateSet(editingSetId, w, r, p);
      setEditingSetId(null);
    } else {
      onLogSet(w, r, p);
    }
    setWeight('');
    setReps('');
    setRpe('');
  }

  function startEditing(set: LoggedSet) {
    setEditingSetId(set.id);
    setWeight(set.weight != null ? String(set.weight) : '');
    setReps(set.reps != null ? String(set.reps) : '');
    setRpe(set.rpe != null ? String(set.rpe) : '');
  }

  return (
    <View style={styles.card}>
      <Text style={typography.body}>{exercise.exerciseName}</Text>
      {exercise.supersetGroup != null && <Text style={typography.label}>Superset {exercise.supersetGroup}</Text>}
      {sets.map((set) => (
        <Pressable key={set.id} onPress={() => startEditing(set)} style={styles.setRow}>
          <Text style={typography.label}>
            Set {set.setNumber}: {set.weight ?? '-'} kg x {set.reps ?? '-'}
            {set.rpe != null ? ` @ RPE ${set.rpe}` : ''}
          </Text>
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="kg" value={weight} onChangeText={setWeight} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="reps" value={reps} onChangeText={setReps} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="RPE" value={rpe} onChangeText={setRpe} keyboardType="numeric" />
      </View>
      <Button title={editingSetId ? 'Update Set' : 'Add Set'} variant="secondary" onPress={handleConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  setRow: {
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    color: colors.textPrimary,
  },
});
