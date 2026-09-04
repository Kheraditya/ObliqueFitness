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

  const nextSetNumber = sets.length + 1;

  return (
    <View style={styles.card}>
      <Text style={typography.body}>{exercise.exerciseName}</Text>
      {exercise.supersetGroup != null && <Text style={typography.label}>Superset {exercise.supersetGroup}</Text>}
      <View style={styles.columnHeaderRow}>
        <Text style={styles.columnHeader}>SET</Text>
        <Text style={styles.columnHeader}>KG</Text>
        <Text style={styles.columnHeader}>REPS</Text>
        <Text style={styles.columnHeader}>RPE</Text>
      </View>
      {sets.map((set) => (
        <Pressable key={set.id} onPress={() => startEditing(set)} style={styles.setRow}>
          <View style={styles.setBadge}>
            <Text style={styles.setBadgeText}>{set.setNumber}</Text>
          </View>
          <Text style={styles.setValue}>{set.weight ?? '-'}</Text>
          <Text style={styles.setValue}>{set.reps ?? '-'}</Text>
          <Text style={styles.setValue}>{set.rpe ?? '-'}</Text>
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{editingSetId ? sets.find((s) => s.id === editingSetId)?.setNumber ?? nextSetNumber : nextSetNumber}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="-"
          placeholderTextColor={colors.textSecondary}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="reps"
          placeholderTextColor={colors.textSecondary}
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="RPE"
          placeholderTextColor={colors.textSecondary}
          value={rpe}
          onChangeText={setRpe}
          keyboardType="numeric"
        />
      </View>
      <Button title={editingSetId ? 'Update Set' : 'Add Set'} variant="dark" icon="add" onPress={handleConfirm} />
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
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  columnHeader: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  setBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.s,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
