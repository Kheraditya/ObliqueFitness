import { useState } from 'react';
import { Image, Text, TextInput, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SessionExercise, LoggedSet, PreviousSet } from '../types';
import { colors, radius, spacing, typography } from '../../../theme';

interface SessionExerciseCardProps {
  exercise: SessionExercise;
  sets: LoggedSet[];
  previousSets?: PreviousSet[];
  onLogSet: (weight: number | null, reps: number | null, rpe: number | null) => void;
  onUpdateSet: (setId: string, weight: number | null, reps: number | null, rpe: number | null) => void;
  // Controlled by the "RPE Tracking" workout setting -- defaults on so every existing caller
  // (and every prior test) keeps behaving exactly as before without passing this explicitly.
  showRpe?: boolean;
  onStartRestTimer?: () => void;
}

function parseNum(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function previousLabel(set: PreviousSet | undefined): string {
  if (!set || (set.weight == null && set.reps == null)) return '-';
  return `${set.weight ?? '-'} kg x ${set.reps ?? '-'}`;
}

export function SessionExerciseCard({
  exercise,
  sets,
  previousSets = [],
  onLogSet,
  onUpdateSet,
  showRpe = true,
  onStartRestTimer,
}: SessionExerciseCardProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState(exercise.notes ?? '');
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
  const activeSetNumber = editingSetId
    ? sets.find((set) => set.id === editingSetId)?.setNumber ?? nextSetNumber
    : nextSetNumber;

  return (
    <View style={styles.card}>
      <View style={styles.exerciseHeader}>
        {exercise.imageUri ? (
          <Image source={{ uri: exercise.imageUri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.exerciseTitleColumn}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.supersetGroup != null && <Text style={typography.label}>Superset {exercise.supersetGroup}</Text>}
        </View>
        <Ionicons name="ellipsis-vertical" size={23} color={colors.textPrimary} />
      </View>
      <TextInput
        style={styles.notesInput}
        placeholder="Add workout notes here"
        placeholderTextColor={colors.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Pressable
        style={styles.restRow}
        onPress={onStartRestTimer}
        disabled={!onStartRestTimer || exercise.restSeconds <= 0}
        accessibilityRole="button"
        accessibilityLabel="Start rest timer"
      >
        <Ionicons name="stopwatch-outline" size={20} color={colors.accent} />
        <Text style={styles.restText}>Rest Timer: {exercise.restSeconds > 0 ? `${exercise.restSeconds}s` : 'OFF'}</Text>
      </Pressable>
      <View style={styles.columnHeaderRow}>
        <Text style={[styles.columnHeader, styles.setColumnHeader]}>SET</Text>
        <Text style={[styles.columnHeader, styles.previousColumn]}>PREVIOUS</Text>
        <Text style={styles.columnHeader}>KG</Text>
        <Text style={styles.columnHeader}>REPS</Text>
        {showRpe && <Text style={styles.columnHeader}>RPE</Text>}
        <View style={styles.doneColumn} />
      </View>
      {sets.map((set) => (
        <Pressable key={set.id} onPress={() => startEditing(set)} style={styles.setRow}>
          <View style={styles.setBadge}>
            <Text style={styles.setBadgeText}>{set.setNumber}</Text>
          </View>
          <Text style={styles.previousValue} numberOfLines={1}>
            {previousLabel(previousSets.find((previous) => previous.setNumber === set.setNumber))}
          </Text>
          <Text style={styles.setValue}>{set.weight ?? '-'}</Text>
          <Text style={styles.setValue}>{set.reps ?? '-'}</Text>
          {showRpe && <Text style={styles.setValue}>{set.rpe ?? '-'}</Text>}
          <View style={[styles.completeButton, styles.completeButtonDone]}>
            <Ionicons name="checkmark" size={20} color={colors.textPrimary} />
          </View>
        </Pressable>
      ))}
      <View style={styles.inputRow}>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{activeSetNumber}</Text>
        </View>
        <Text style={styles.previousValue} numberOfLines={1}>
          {previousLabel(previousSets.find((previous) => previous.setNumber === activeSetNumber))}
        </Text>
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
          placeholder="-"
          placeholderTextColor={colors.textSecondary}
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
        />
        {showRpe && (
          <TextInput
            style={styles.input}
            placeholder="-"
            placeholderTextColor={colors.textSecondary}
            value={rpe}
            onChangeText={setRpe}
            keyboardType="numeric"
          />
        )}
        <Pressable
          onPress={handleConfirm}
          style={styles.completeButton}
          accessibilityRole="button"
          accessibilityLabel={editingSetId ? 'Update completed set' : 'Complete set'}
          testID="complete-set-button"
        >
          <Ionicons name="checkmark" size={21} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    paddingVertical: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  thumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseTitleColumn: {
    flex: 1,
  },
  exerciseName: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  notesInput: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.m,
    padding: 0,
    minHeight: 24,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.l,
  },
  restText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.l,
  },
  columnHeader: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Matches the 28px set-number badge in the set/input rows below, so SET sits over
  // the badge column and KG/REPS/RPE sit over the three flex:1 value columns.
  setColumnHeader: {
    flex: 0,
    width: 28,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
    minHeight: 48,
  },
  setValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    // Centered to match the input boxes below, which use textAlign: 'center'.
    textAlign: 'center',
  },
  previousColumn: {
    flex: 1.35,
  },
  previousValue: {
    flex: 1.35,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  setBadge: {
    width: 32,
    height: 36,
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
    minHeight: 44,
  },
  doneColumn: {
    width: 40,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.s,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDone: {
    backgroundColor: colors.accent,
  },
});
